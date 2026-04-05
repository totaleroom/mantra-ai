import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Dynamic Config Engine: reads from platform_settings first, fallback to env.
 * To change API URL/key, update Settings in dashboard — no code change needed.
 */
async function getConfig(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const db: Record<string, string> = {};
  for (const row of data || []) db[row.key] = row.value;
  return {
    wa_provider: db.wa_provider || "evolution",
    evolution_api_url: db.evolution_api_url || Deno.env.get("EVOLUTION_API_URL") || "",
    evolution_api_key: db.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY") || "",
    wwebjs_api_url: db.wwebjs_api_url || Deno.env.get("WWEBJS_API_URL") || "",
    wwebjs_api_key: db.wwebjs_api_key || Deno.env.get("WWEBJS_API_KEY") || "",
    wa_webhook_secret: db.wa_webhook_secret || Deno.env.get("WA_WEBHOOK_SECRET") || "",
  };
}

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

    if (errA.includes("requires property") || resA.status === 400) {
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
  if (data.base64) return data.base64;
  if (data.code) return data.code;
  if (data.qrcode?.base64) return data.qrcode.base64;
  if (data.qrcode?.code) return data.qrcode.code;
  if (data.qrcode && typeof data.qrcode === "string") return data.qrcode;
  if (data.pairingCode) return data.pairingCode;
  return null;
}

/** Log an operation to wa_ops_logs */
async function logOp(supabase: any, instanceName: string | null, action: string, status: string, startTime: number, errorMessage?: string, metadata?: any) {
  try {
    await supabase.from("wa_ops_logs").insert({
      instance_name: instanceName,
      action,
      status,
      latency_ms: Date.now() - startTime,
      error_message: errorMessage || null,
      metadata: metadata || {},
    });
  } catch (e) {
    console.warn("Failed to log operation:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const opStart = Date.now();

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === Dynamic Config: DB first, env fallback ===
    const cfg = await getConfig(supabaseAdmin);

    if (!cfg.evolution_api_url || !cfg.evolution_api_key) {
      throw new Error("Evolution API not configured. Update Settings → WhatsApp API in dashboard.");
    }
    const baseUrl = cfg.evolution_api_url.replace(/\/$/, "");
    const EVOLUTION_API_KEY = cfg.evolution_api_key;

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Helper to get webhook config (also dynamic)
    const getWebhookConfig = async () => {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/wa-webhook`;
      return { webhookUrl, webhookSecret: cfg.wa_webhook_secret };
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

      await supabaseAdmin.from("wa_sessions").delete().eq("instance_name", instance_name);
      await logOp(supabaseAdmin, instance_name, "delete", "ok", opStart);

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
        latency_ms: 0,
        instances: [],
        webhook_status: {},
        errors: [],
      };

      const pingStart = Date.now();
      try {
        const pingRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        result.latency_ms = Date.now() - pingStart;
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
        result.latency_ms = Date.now() - pingStart;
        result.errors.push(`Cannot reach Evolution API: ${e instanceof Error ? e.message : String(e)}`);
      }

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

      await logOp(supabaseAdmin, null, "health-check", result.evolution_reachable ? "ok" : "error", opStart);

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- DIAGNOSTICS ---
    if (action === "diagnostics") {
      const { webhookUrl } = await getWebhookConfig();
      
      const result: any = {
        evolution_reachable: false,
        latency_ms: 0,
        vps_instances: [],
        db_sessions: [],
        instance_details: [],
        summary: { connected: 0, connecting: 0, disconnected: 0, error: 0, total_vps: 0, total_db: 0 },
        recommendations: [],
      };

      const pingStart = Date.now();
      let vpsInstances: any[] = [];
      try {
        const pingRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        result.latency_ms = Date.now() - pingStart;
        if (pingRes.ok) {
          result.evolution_reachable = true;
          vpsInstances = await pingRes.json() || [];
        } else {
          await pingRes.text();
          result.recommendations.push("Evolution API tidak bisa diakses. Periksa service di VPS.");
        }
      } catch (e) {
        result.latency_ms = Date.now() - pingStart;
        result.recommendations.push(`Evolution API error: ${e instanceof Error ? e.message : String(e)}`);
      }

      result.vps_instances = vpsInstances.map((i: any) => ({
        name: i.name || i.instanceName,
        status: i.connectionStatus,
      }));
      result.summary.total_vps = vpsInstances.length;

      const { data: dbSessions } = await supabaseAdmin
        .from("wa_sessions")
        .select("id, client_id, instance_name, status, qr_code, last_error, last_webhook_event_at, updated_at");
      result.db_sessions = dbSessions || [];
      result.summary.total_db = (dbSessions || []).length;

      const allNames = new Set<string>();
      for (const v of vpsInstances) allNames.add(v.name || v.instanceName);
      for (const d of dbSessions || []) if (d.instance_name) allNames.add(d.instance_name);

      for (const name of allNames) {
        const vps = vpsInstances.find((i: any) => (i.name || i.instanceName) === name);
        const db = (dbSessions || []).find((d: any) => d.instance_name === name);
        
        const detail: any = {
          instance_name: name,
          in_vps: !!vps,
          in_db: !!db,
          vps_status: vps?.connectionStatus || null,
          db_status: db?.status || null,
          has_qr: !!db?.qr_code,
          last_error: db?.last_error || null,
          last_webhook_event_at: db?.last_webhook_event_at || null,
          webhook: null,
          recommendations: [],
        };

        const status = db?.status || (vps?.connectionStatus === "open" ? "connected" : "disconnected");
        if (status === "connected") result.summary.connected++;
        else if (status === "connecting") result.summary.connecting++;
        else if (status === "error") result.summary.error++;
        else result.summary.disconnected++;

        if (result.evolution_reachable && vps) {
          try {
            const whRes = await fetch(`${baseUrl}/webhook/find/${encodeURIComponent(name)}`, {
              method: "GET",
              headers: { apikey: EVOLUTION_API_KEY },
            });
            if (whRes.ok) {
              const whData = await whRes.json();
              const whUrl = whData?.url || whData?.webhook?.url;
              const whEnabled = whData?.enabled ?? whData?.webhook?.enabled ?? false;
              detail.webhook = { configured: !!whUrl, url: whUrl, enabled: whEnabled };
              
              if (!whUrl || !whEnabled) {
                detail.recommendations.push("Webhook belum aktif. Klik 'Perbaiki Webhook'.");
              } else if (whUrl !== webhookUrl) {
                detail.recommendations.push("Webhook URL tidak sesuai. Klik 'Perbaiki Webhook'.");
              }
            } else {
              await whRes.text();
              detail.webhook = { configured: false };
              detail.recommendations.push("Webhook belum terpasang.");
            }
          } catch {
            detail.webhook = { configured: false, error: "check failed" };
          }
        }

        if (db?.last_webhook_event_at) {
          const age = Date.now() - new Date(db.last_webhook_event_at).getTime();
          if (age > 5 * 60 * 1000) {
            detail.recommendations.push("Tidak ada event webhook > 5 menit. Periksa koneksi.");
          }
        } else if (db) {
          detail.recommendations.push("Belum pernah menerima event webhook.");
        }

        if (!vps && db) {
          detail.recommendations.push("Instance ada di database tapi tidak di VPS. Buat ulang atau hapus.");
        }
        if (vps && !db) {
          detail.recommendations.push("Instance ada di VPS tapi tidak di database. Gunakan Sync.");
        }
        if (db?.status === "connecting" && !db?.qr_code) {
          detail.recommendations.push("Status connecting tapi QR kosong. Restart lalu Fetch QR.");
        }

        result.instance_details.push(detail);
      }

      if (!result.evolution_reachable) {
        result.recommendations.push("KRITIS: Evolution API tidak bisa diakses.");
      }
      if (result.summary.total_vps === 0 && result.evolution_reachable) {
        result.recommendations.push("Tidak ada instance di VPS. Buat instance baru.");
      }

      await logOp(supabaseAdmin, null, "diagnostics", "ok", opStart, undefined, { summary: result.summary });

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- TEST-ALL ---
    if (action === "test-all") {
      const steps: any[] = [];
      let overallStatus = "ok";

      const step1Start = Date.now();
      try {
        const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const latency = Date.now() - step1Start;
        if (res.ok) {
          const instances = await res.json();
          steps.push({ name: "Evolution API", status: "ok", latency_ms: latency, detail: `${instances.length} instance ditemukan` });
        } else {
          await res.text();
          steps.push({ name: "Evolution API", status: "error", latency_ms: latency, detail: `HTTP ${res.status}` });
          overallStatus = "error";
        }
      } catch (e) {
        steps.push({ name: "Evolution API", status: "error", latency_ms: Date.now() - step1Start, detail: String(e) });
        overallStatus = "error";
      }

      const { data: sessions } = await supabaseAdmin.from("wa_sessions").select("instance_name, status, last_webhook_event_at, last_error");
      const connected = (sessions || []).filter(s => s.status === "connected").length;
      const disconnected = (sessions || []).filter(s => s.status === "disconnected").length;
      const connecting = (sessions || []).filter(s => s.status === "connecting").length;
      const errCount = (sessions || []).filter(s => s.status === "error").length;
      steps.push({
        name: "Database Sessions",
        status: connected > 0 ? "ok" : disconnected > 0 ? "warn" : "ok",
        detail: `${connected} connected, ${connecting} connecting, ${disconnected} disconnected, ${errCount} error`,
      });
      if (disconnected > 0 || errCount > 0) overallStatus = overallStatus === "error" ? "error" : "warn";

      const now = Date.now();
      const staleInstances: string[] = [];
      for (const s of sessions || []) {
        if (s.last_webhook_event_at) {
          const age = now - new Date(s.last_webhook_event_at).getTime();
          if (age > 5 * 60 * 1000) staleInstances.push(s.instance_name || "?");
        } else {
          staleInstances.push(s.instance_name || "?");
        }
      }
      steps.push({
        name: "Webhook Heartbeat",
        status: staleInstances.length === 0 ? "ok" : "warn",
        detail: staleInstances.length === 0 
          ? "Semua instance aktif menerima event" 
          : `${staleInstances.length} instance tidak ada event terbaru: ${staleInstances.join(", ")}`,
      });

      const pingId = `ping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const webhookEndpoint = `${SUPABASE_URL}/functions/v1/wa-webhook`;
      
      let inboundOk = false;
      let inboundDetail = "";
      const inboundStart = Date.now();
      try {
        const pingRes = await fetch(webhookEndpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Webhook-Secret": cfg.wa_webhook_secret,
          },
          body: JSON.stringify({
            event: "diagnostic.ping",
            instance: "_diagnostic",
            data: { ping_id: pingId },
          }),
        });
        const inboundLatency = Date.now() - inboundStart;
        
        if (pingRes.ok) {
          await new Promise(r => setTimeout(r, 500));
          const { data: pingLog } = await supabaseAdmin
            .from("wa_ops_logs")
            .select("id")
            .eq("action", "diagnostic.ping")
            .filter("metadata->>ping_id", "eq", pingId)
            .maybeSingle();
          
          if (pingLog) {
            inboundOk = true;
            inboundDetail = `Webhook endpoint menerima & menyimpan ping (${inboundLatency}ms)`;
          } else {
            inboundDetail = `Webhook merespon OK tapi ping tidak tersimpan di database (${inboundLatency}ms)`;
          }
        } else {
          const errText = await pingRes.text();
          inboundDetail = `Webhook merespon HTTP ${pingRes.status}: ${errText.substring(0, 100)}`;
        }
      } catch (e) {
        inboundDetail = `Tidak bisa menghubungi webhook endpoint: ${e instanceof Error ? e.message : String(e)}`;
      }
      
      steps.push({
        name: "Inbound Webhook (VPS→Dashboard)",
        status: inboundOk ? "ok" : "error",
        latency_ms: Date.now() - inboundStart,
        detail: inboundDetail,
      });
      if (!inboundOk) overallStatus = overallStatus === "error" ? "error" : "warn";

      const { data: recentLogs } = await supabaseAdmin
        .from("wa_ops_logs")
        .select("action, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      const recentErrors = (recentLogs || []).filter(l => l.status === "error" || l.error_message);
      steps.push({
        name: "Recent Operations",
        status: recentErrors.length === 0 ? "ok" : "warn",
        detail: recentErrors.length === 0 
          ? "Tidak ada error terbaru" 
          : `${recentErrors.length} error terbaru ditemukan`,
      });

      await logOp(supabaseAdmin, null, "test-all", overallStatus, opStart);

      return new Response(
        JSON.stringify({ success: true, overall_status: overallStatus, steps, sessions_summary: { connected, connecting, disconnected, error: errCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SET-WEBHOOK ---
    if (action === "set-webhook") {
      const { instance_name } = body;
      if (!instance_name) throw new Error("instance_name required");

      const { webhookUrl, webhookSecret } = await getWebhookConfig();
      const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, instance_name, webhookUrl, webhookSecret);

      if (!whResult.ok) {
        await updateSessionError(instance_name, `Webhook setup failed: ${whResult.error}`);
      } else {
        await supabaseAdmin.from("wa_sessions").update({ last_error: null }).eq("instance_name", instance_name);
      }

      await logOp(supabaseAdmin, instance_name, "set-webhook", whResult.ok ? "ok" : "error", opStart, whResult.error);

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
            await logOp(supabaseAdmin, instance_name, "create", "error", opStart, errText2);
            throw new Error(`Failed to create instance: ${createRes2.status} - ${errText2}`);
          }
          createData = await createRes2.json();

          const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, instance_name, webhookUrl, webhookSecret);
          console.log(`Webhook set result for ${instance_name}:`, whResult);
        } else {
          await logOp(supabaseAdmin, instance_name, "create", "error", opStart, errText);
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

      await logOp(supabaseAdmin, instance_name, "create", "ok", opStart, undefined, { has_qr: !!qrCode });

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
        if (connectRes.status === 404) {
          await updateSessionError(instance_name, "Instance tidak ditemukan di VPS. Coba Sync atau buat ulang.");
          await logOp(supabaseAdmin, instance_name, "connect", "error", opStart, "not_found");
          throw new Error("Instance tidak ditemukan di Evolution API. Mungkin sudah dihapus dari VPS.");
        }
        await updateSessionError(instance_name, `Connect gagal: HTTP ${connectRes.status}`);
        await logOp(supabaseAdmin, instance_name, "connect", "error", opStart, errText);
        throw new Error(`Connect failed: ${connectRes.status} - ${errText}`);
      }

      const connectData = await connectRes.json();
      const qrCode = extractQrCode(connectData);

      if (qrCode) {
        await supabaseAdmin
          .from("wa_sessions")
          .update({ qr_code: qrCode, status: "connecting", last_error: null })
          .eq("instance_name", instance_name);
        await logOp(supabaseAdmin, instance_name, "connect", "ok", opStart, undefined, { has_qr: true });
      } else {
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
              await logOp(supabaseAdmin, instance_name, "connect", "ok", opStart, undefined, { already_connected: true });
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
        await logOp(supabaseAdmin, instance_name, "connect", "warn", opStart, "no_qr");
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
          await logOp(supabaseAdmin, instance_name, "restart", "error", opStart, "not_found");
          throw new Error("Instance tidak ditemukan di VPS. Coba Sync atau buat ulang.");
        }
      } else {
        await restartRes.text();
      }

      await supabaseAdmin
        .from("wa_sessions")
        .update({ status: "connecting", qr_code: null, last_error: null })
        .eq("instance_name", instance_name);

      await logOp(supabaseAdmin, instance_name, "restart", "ok", opStart);

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

      await logOp(supabaseAdmin, instance_name, "logout", "ok", opStart);

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
        await logOp(supabaseAdmin, null, "sync", "error", opStart, errText);
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

        const whResult = await setWebhookWithFallback(baseUrl, EVOLUTION_API_KEY, name, webhookUrl, webhookSecret);
        if (!whResult.ok) {
          console.warn(`Webhook setup failed for ${name}:`, whResult.error);
        }
      }

      await logOp(supabaseAdmin, null, "sync", "ok", opStart, undefined, { synced: synced.length, existing: existing.length });

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

      await logOp(supabaseAdmin, null, "delete-all", "ok", opStart);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("manage-wa-instance error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
