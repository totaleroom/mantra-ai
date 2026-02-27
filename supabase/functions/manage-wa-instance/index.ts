import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * manage-wa-instance: Create, connect, restart, delete WhatsApp instances via Evolution API
 *
 * POST ?action=create  { client_id, instance_name }
 * POST ?action=connect { instance_name }
 * POST ?action=restart { instance_name }
 * POST ?action=logout  { instance_name }
 * DELETE               { instance_name }
 */
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

    // === DELETE: Remove instance ===
    if (req.method === "DELETE") {
      const { instance_name } = await req.json();
      if (!instance_name) throw new Error("instance_name required");

      // Delete from Evolution API
      try {
        const delRes = await fetch(`${baseUrl}/instance/delete/${instance_name}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (!delRes.ok) {
          const t = await delRes.text();
          console.warn("Evolution delete warning:", delRes.status, t);
        } else {
          await delRes.text();
        }
      } catch (e) {
        console.warn("Evolution delete failed (non-critical):", e);
      }

      // Delete from database
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

    // --- CREATE ---
    if (action === "create") {
      const { client_id, instance_name } = body;
      if (!client_id || !instance_name) throw new Error("client_id and instance_name required");

      // Get webhook secret from platform_settings
      const { data: secretRow } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", "wa_webhook_secret")
        .maybeSingle();
      const webhookSecret = secretRow?.value || Deno.env.get("WA_WEBHOOK_SECRET") || "";

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/wa-webhook`;

      // Create instance on Evolution API
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({
          instanceName: instance_name,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: true,
            headers: { "X-Webhook-Secret": webhookSecret },
            events: [
              "MESSAGES_UPSERT",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED",
            ],
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Evolution create error:", createRes.status, errText);
        throw new Error(`Failed to create instance: ${createRes.status} - ${errText}`);
      }

      const createData = await createRes.json();
      const qrCode = createData.qrcode?.base64 || createData.qrcode?.code || null;

      // Insert wa_sessions row
      const { error: insertErr } = await supabaseAdmin
        .from("wa_sessions")
        .insert({
          client_id,
          instance_name,
          status: "connecting",
          qr_code: qrCode,
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

      const connectRes = await fetch(`${baseUrl}/instance/connect/${instance_name}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (!connectRes.ok) {
        const errText = await connectRes.text();
        throw new Error(`Connect failed: ${connectRes.status} - ${errText}`);
      }

      const connectData = await connectRes.json();
      const qrCode = connectData.base64 || connectData.code || null;

      // Update QR in database
      if (qrCode) {
        await supabaseAdmin
          .from("wa_sessions")
          .update({ qr_code: qrCode, status: "connecting" })
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

      const restartRes = await fetch(`${baseUrl}/instance/restart/${instance_name}`, {
        method: "PUT",
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (!restartRes.ok) {
        const errText = await restartRes.text();
        console.warn("Restart warning:", restartRes.status, errText);
      } else {
        await restartRes.text();
      }

      await supabaseAdmin
        .from("wa_sessions")
        .update({ status: "connecting", qr_code: null })
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
        const logoutRes = await fetch(`${baseUrl}/instance/logout/${instance_name}`, {
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
        .update({ status: "disconnected", qr_code: null })
        .eq("instance_name", instance_name);

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
