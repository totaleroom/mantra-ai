import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Try to set webhook with camelCase format first, fallback to nested format */
async function setWebhookWithFallback(
  baseUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string
): Promise<{ ok: boolean; format: string; error?: string }> {
  const encoded = encodeURIComponent(instanceName);
  const events = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"];

  // Format A: camelCase flat (Evolution v2)
  try {
    const resA = await fetch(`${baseUrl}/webhook/set/${encoded}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        headers: { "X-Webhook-Secret": webhookSecret },
        events,
      }),
    });
    if (resA.ok) {
      await resA.text();
      return { ok: true, format: "camelCase" };
    }
    const errA = await resA.text();
    console.warn(`Webhook format A failed for ${instanceName}:`, resA.status, errA);

    // If schema error, try format B
    if (errA.includes("requires property") || resA.status === 400) {
      // Format B: nested webhook object (Evolution v1)
      const resB = await fetch(`${baseUrl}/webhook/set/${encoded}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: true,
            headers: { "X-Webhook-Secret": webhookSecret },
            events,
          },
        }),
      });
      if (resB.ok) {
        await resB.text();
        return { ok: true, format: "nested" };
      }
      const errB = await resB.text();
      console.warn(`Webhook format B also failed for ${instanceName}:`, resB.status, errB);
      return { ok: false, format: "both_failed", error: errB };
    }
    return { ok: false, format: "camelCase_failed", error: errA };
  } catch (e) {
    return { ok: false, format: "exception", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Extract QR code from various Evolution API response formats */
function extractQrCode(data: any): string | null {
  if (!data) return null;
  // Direct fields
  if (data.base64) return data.base64;
  if (data.code) return data.code;
  // Nested qrcode object
  if (data.qrcode?.base64) return data.qrcode.base64;
  if (data.qrcode?.code) return data.qrcode.code;
  // Nested pairingCode
  if (data.pairingCode) return data.pairingCode;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API not configured");
    }
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Helper to get webhook config
    const getWebhookConfig = async () => {
      const { data: secretRow } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", "wa_webhook_secret")
        .maybeSingle();
      const webhookSecret = secretRow?.value || Deno.env.get("WA_WEBHOOK_SECRET") || "";
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/wa-webhook`;
      return { webhookUrl, webhookSecret };
    };

    // Helper to update session with error
    const updateSessionError = async (instanceName: string, error: string) => {
      await supabaseAdmin
        .from("wa_sessions")
        .update({ status: "error", last_error: error })
        .eq("instance_name", instanceName);
    };

    // === DELETE: Remove instance ===
    if (req.method === "DELETE") {
      const { instance_name } = await req.json();
      if (!instance_name) throw new Error("instance_name required");

      try {
        const delRes = await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(instance_name)}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const delText = await delRes.text();
        if (!delRes.ok) console.warn("Evolution delete warning:", delRes.status, delText);
      } catch (e) {
        console.warn("Evolution delete failed (non-critical):", e);
      }

      await supabaseAdmin
        .from("wa_sessions")
        .delete()
        .eq("instance_name", instance_name);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === POST actions ===
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // --- HEALTH-CHECK ---
    if (action === "health-check") {
      const result: any = {
        evolution_reachable: false,
        instances: [],
        webhook_status: {},
        errors: [],
      };

      // 1. Check Evolution API reachability
      try {
        const pingRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (pingRes.ok) {
          result.evolution_reachable = true;
          const instances = await pingRes.json();
          result.instances = (instances || []).map((inst: any) => ({
            name: inst.name || inst.instanceName || "unknown",
            status: inst.connectionStatus === "open" ? "connected" : inst.connectionStatus || "unknown",
          }));
        } else {
          const errText = await pingRes.text();
          result.errors.push(`Evolution API returned ${pingRes.status}: ${errText.substring(0, 200)}`);
        }
      } catch (e) {
        result.errors.push(`Cannot reach Evolution API: ${e instanceof Error ? e.message : String(e)}`);
      }

      // 2. Check webhook config for specific instances
      if (result.evolution_reachable && result.instances.length > 0) {
        for (const inst of result.instances) {
          try {
            const whRes = await fetch(`${baseUrl}/webhook/find/${encodeURIComponent(inst.name)}`, {
              method: "GET",
              headers: { apikey: EVOLUTION_API_KEY },
            });
            if (whRes.ok) {
              const whData = await whRes.json();
              result.webhook_status[inst.name] = {
                configured: !!whData && whData !== null && Object.keys(whData).length > 0,
                url: whData?.url || whData?.webhook?.url || null,
                enabled: whData?.enabled ?? whData?.webhook?.enabled ?? false,
              };
            } else {
              await whRes.text();
              result.webhook_status[inst.name] = { configured: false, error: `HTTP ${whRes.status}` };
            }
          } catch (e) {
            result.webhook_status[inst.name] = { configured: false, error: String(e) };
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SET-WEBHOOK: Fix webhook for an instance ---
    if (action === "set-webhook") {
      const { instance_name } = body;
      if (!instance_name) throw new Error("instance_name required");

      const { webhookUrl, webhookSecret } = await getWebhookConfig();
      const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, instance_name, webhookUrl, webhookSecret);

      if (!whResult.ok) {
        await updateSessionError(instance_name, `Webhook setup failed: ${whResult.error}`);
      } else {
        await supabaseAdmin
          .from("wa_sessions")
          .update({ last_error: null })
          .eq("instance_name", instance_name);
      }

      return new Response(
        JSON.stringify({ success: whResult.ok, ...whResult }),
        { status: whResult.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- CREATE ---
    if (action === "create") {
      const { client_id, instance_name } = body;
      if (!client_id || !instance_name) throw new Error("client_id and instance_name required");

      const { webhookUrl, webhookSecret } = await getWebhookConfig();

      // Create instance - try with webhook in create payload
      let createData: any;
      const createPayload = {
        instanceName: instance_name,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: { "X-Webhook-Secret": webhookSecret },
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      };

      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Evolution create error:", createRes.status, errText);

        // If webhook format issue, try without webhook and set separately
        if (errText.includes("requires property") || createRes.status === 400) {
          const createRes2 = await fetch(`${baseUrl}/instance/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
            body: JSON.stringify({
              instanceName: instance_name,
              integration: "WHATSAPP-BAILEYS",
              qrcode: true,
            }),
          });
          if (!createRes2.ok) {
            const errText2 = await createRes2.text();
            throw new Error(`Failed to create instance: ${createRes2.status} - ${errText2}`);
          }
          createData = await createRes2.json();

          // Set webhook separately with fallback
          const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, instance_name, webhookUrl, webhookSecret);
          console.log(`Webhook set result for ${instance_name}:`, whResult);
        } else {
          throw new Error(`Failed to create instance: ${createRes.status} - ${errText}`);
        }
      } else {
        createData = await createRes.json();
      }

      const qrCode = extractQrCode(createData);

      const { error: insertErr } = await supabaseAdmin
        .from("wa_sessions")
        .insert({
          client_id,
          instance_name,
          status: "connecting",
          qr_code: qrCode,
          last_error: null,
        });

      if (insertErr) {
        console.error("Insert wa_sessions error:", insertErr);
        throw new Error("Failed to insert session: " + insertErr.message);
      }

      return new Response(
        JSON.stringify({ success: true, qr_code: qrCode, instance: createData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- CONNECT (fetch QR) ---
    if (action === "connect") {
      const { instance_name } = body;
      if (!instance_name) throw new Error("instance_name required");

      const connectRes = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(instance_name)}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (!connectRes.ok) {
        const errText = await connectRes.text();
        // Provide actionable error messages
        if (connectRes.status === 404) {
          await updateSessionError(instance_name, "Instance tidak ditemukan di VPS. Coba Sync atau buat ulang.");
          throw new Error("Instance tidak ditemukan di Evolution API. Mungkin sudah dihapus dari VPS.");
        }
        await updateSessionError(instance_name, `Connect gagal: HTTP ${connectRes.status}`);
        throw new Error(`Connect failed: ${connectRes.status} - ${errText}`);
      }

      const connectData = await connectRes.json();
      const qrCode = extractQrCode(connectData);

      if (qrCode) {
        await supabaseAdmin
          .from("wa_sessions")
          .update({ qr_code: qrCode, status: "connecting", last_error: null })
          .eq("instance_name", instance_name);
      } else {
        // Check connection state - maybe already connected
        try {
          const stateRes = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance_name)}`, {
            method: "GET",
            headers: { apikey: EVOLUTION_API_KEY },
          });
          if (stateRes.ok) {
            const stateData = await stateRes.json();
            const state = stateData?.state || stateData?.instance?.state;
            if (state === "open") {
              await supabaseAdmin
                .from("wa_sessions")
                .update({ status: "connected", qr_code: null, last_error: null })
                .eq("instance_name", instance_name);
              return new Response(
                JSON.stringify({ success: true, qr_code: null, already_connected: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            await stateRes.text();
          }
        } catch (e) {
          console.warn("Connection state check failed:", e);
        }

        await supabaseAdmin
          .from("wa_sessions")
          .update({ status: "connecting", last_error: "QR belum tersedia. Coba restart instance lalu fetch QR ulang." })
          .eq("instance_name", instance_name);
      }

      return new Response(
        JSON.stringify({ success: true, qr_code: qrCode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- RESTART ---
    if (action === "restart") {
      const { instance_name } = body;
      if (!instance_name) throw new Error("instance_name required");

      const restartRes = await fetch(`${baseUrl}/instance/restart/${encodeURIComponent(instance_name)}`, {
        method: "PUT",
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (!restartRes.ok) {
        const errText = await restartRes.text();
        console.warn("Restart warning:", restartRes.status, errText);
        if (restartRes.status === 404) {
          await updateSessionError(instance_name, "Instance tidak ditemukan di VPS.");
          throw new Error("Instance tidak ditemukan di VPS. Coba Sync atau buat ulang.");
        }
      } else {
        await restartRes.text();
      }

      await supabaseAdmin
        .from("wa_sessions")
        .update({ status: "connecting", qr_code: null, last_error: null })
        .eq("instance_name", instance_name);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- LOGOUT ---
    if (action === "logout") {
      const { instance_name } = body;
      if (!instance_name) throw new Error("instance_name required");

      try {
        const logoutRes = await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(instance_name)}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (!logoutRes.ok) {
          console.warn("Logout warning:", logoutRes.status);
        }
        await logoutRes.text();
      } catch (e) {
        console.warn("Logout failed:", e);
      }

      await supabaseAdmin
        .from("wa_sessions")
        .update({ status: "disconnected", qr_code: null, last_error: null })
        .eq("instance_name", instance_name);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SYNC ---
    if (action === "sync") {
      const { client_id } = body;
      if (!client_id) throw new Error("client_id required");

      const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      if (!fetchRes.ok) {
        const errText = await fetchRes.text();
        throw new Error(`Gagal mengambil daftar instance dari VPS: ${fetchRes.status}`);
      }
      const instances = await fetchRes.json();

      const { data: existingSessions } = await supabaseAdmin
        .from("wa_sessions")
        .select("instance_name");
      const existingNames = new Set((existingSessions || []).map((s: any) => s.instance_name));

      const { webhookUrl, webhookSecret } = await getWebhookConfig();

      const synced: string[] = [];
      const existing: string[] = [];

      for (const inst of instances) {
        const name = inst.name || inst.instanceName;
        if (!name) continue;

        if (existingNames.has(name)) {
          existing.push(name);
        } else {
          await supabaseAdmin.from("wa_sessions").insert({
            client_id,
            instance_name: name,
            status: inst.connectionStatus === "open" ? "connected" : "disconnected",
            qr_code: null,
            last_error: null,
          });
          synced.push(name);
        }

        // Set webhook with fallback
        const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, name, webhookUrl, webhookSecret);
        if (!whResult.ok) {
          console.warn(`Webhook setup failed for ${name}:`, whResult.error);
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced, existing, total: instances.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- LIST ---
    if (action === "list") {
      const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      if (!fetchRes.ok) {
        const errText = await fetchRes.text();
        throw new Error(`Gagal mengambil daftar instance: ${fetchRes.status}`);
      }
      const instances = await fetchRes.json();
      const result = (instances || []).map((inst: any) => ({
        name: inst.name || inst.instanceName || "unknown",
        status: inst.connectionStatus === "open" ? "connected" : inst.connectionStatus || "unknown",
      }));
      return new Response(
        JSON.stringify({ success: true, instances: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- DELETE-ALL ---
    if (action === "delete-all") {
      const { client_id } = body;

      try {
        const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (fetchRes.ok) {
          const instances = await fetchRes.json();
          for (const inst of instances || []) {
            const name = inst.name || inst.instanceName;
            if (!name) continue;
            try {
              const delRes = await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(name)}`, {
                method: "DELETE",
                headers: { apikey: EVOLUTION_API_KEY },
              });
              await delRes.text();
            } catch (e) {
              console.warn(`Delete instance ${name} failed:`, e);
            }
          }
        } else {
          await fetchRes.text();
        }
      } catch (e) {
        console.warn("Fetch instances for delete-all failed:", e);
      }

      if (client_id) {
        await supabaseAdmin.from("wa_sessions").delete().eq("client_id", client_id);
      } else {
        await supabaseAdmin.from("wa_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-wa-instance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
