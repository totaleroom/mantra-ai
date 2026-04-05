import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Dynamic Config Engine: reads from platform_settings first, fallback to env.
 * Supports multi-provider: evolution, wwebjs, n8n/custom.
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
    n8n_webhook_url: db.n8n_webhook_url || "",
    custom_send_url: db.custom_send_url || "",
    custom_auth_header: db.custom_auth_header || "",
    wa_webhook_secret: db.wa_webhook_secret || Deno.env.get("WA_WEBHOOK_SECRET") || "",
    anti_ban_delay_min: db.anti_ban_delay_min || "2",
    anti_ban_delay_max: db.anti_ban_delay_max || "4",
  };
}

/** Get provider API details based on provider type */
function getProviderApi(cfg: Record<string, string>, provider?: string) {
  const p = provider || cfg.wa_provider || "evolution";
  if (p === "wwebjs") return { url: cfg.wwebjs_api_url, key: cfg.wwebjs_api_key, type: "wwebjs" };
  if (p === "n8n" || p === "custom") return { url: cfg.custom_send_url || cfg.n8n_webhook_url, key: cfg.custom_auth_header, type: "custom" };
  return { url: cfg.evolution_api_url, key: cfg.evolution_api_key, type: "evolution" };
}

/**
 * wa-send-message: Send a WhatsApp message via the configured provider
 * Supports Evolution API, wa-bridge-lite (WWeb.js), and custom/n8n providers.
 */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = req.headers.get("X-Webhook-Secret");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cfg = await getConfig(supabaseAdmin);

    let isAuthenticated = false;

    if (webhookSecret && cfg.wa_webhook_secret && webhookSecret === cfg.wa_webhook_secret) {
      isAuthenticated = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
      if (isAdmin) isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance_name, phone_number, message, conversation_id, sender, provider: reqProvider } = await req.json();
    if (!instance_name || !phone_number || !message) {
      throw new Error("instance_name, phone_number, and message are required");
    }

    // Determine provider: from request, or from session, or from config
    let provider = reqProvider || cfg.wa_provider;
    if (!reqProvider) {
      const { data: sessionData } = await supabaseAdmin
        .from("wa_sessions")
        .select("provider")
        .eq("instance_name", instance_name)
        .maybeSingle();
      if (sessionData?.provider) provider = sessionData.provider;
    }

    const api = getProviderApi(cfg, provider);
    if (!api.url) {
      throw new Error(`Provider ${provider} not configured. Set URL in Settings.`);
    }

    const normalizedPhone = phone_number.replace(/\D/g, "");
    const baseUrl = api.url.replace(/\/$/, "");

    // Anti-ban delay
    const delayMin = parseFloat(cfg.anti_ban_delay_min) * 1000;
    const delayMax = parseFloat(cfg.anti_ban_delay_max) * 1000;
    const delay = delayMin + Math.random() * (delayMax - delayMin);

    // Send based on provider
    let sendData: any;

    if (api.type === "evolution") {
      // 1. Typing indicator
      try {
        await fetch(`${baseUrl}/chat/presence/${instance_name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: api.key },
          body: JSON.stringify({ number: normalizedPhone, presence: "composing" }),
        });
      } catch (e) {
        console.warn("Typing indicator failed (non-critical):", e);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      const sendRes = await fetch(`${baseUrl}/message/sendText/${instance_name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: api.key },
        body: JSON.stringify({ number: normalizedPhone, text: message }),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error("Evolution API send error:", sendRes.status, errText);
        throw new Error(`Failed to send message: ${sendRes.status}`);
      }
      sendData = await sendRes.json();

    } else if (api.type === "wwebjs") {
      await new Promise((resolve) => setTimeout(resolve, delay));

      const sendRes = await fetch(`${baseUrl}/send?session=${encodeURIComponent(instance_name)}&token=${encodeURIComponent(api.key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: normalizedPhone, text: message }),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error("WWebJS send error:", sendRes.status, errText);
        throw new Error(`Failed to send message via WWebJS: ${sendRes.status}`);
      }
      sendData = await sendRes.json();

    } else {
      // Custom/n8n provider
      await new Promise((resolve) => setTimeout(resolve, delay));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (api.key) headers["Authorization"] = api.key;

      const sendRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ to: normalizedPhone, message, instance_name }),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error("Custom provider send error:", sendRes.status, errText);
        throw new Error(`Failed to send message via custom provider: ${sendRes.status}`);
      }
      sendData = await sendRes.json();
    }

    // Log message to wa_messages if conversation_id provided
    if (conversation_id && sender) {
      await supabaseAdmin.from("wa_messages").insert({
        conversation_id,
        sender,
        content: message,
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: sendData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("wa-send-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
