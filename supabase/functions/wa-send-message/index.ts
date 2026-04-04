import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Dynamic Config Engine: reads from platform_settings first, fallback to env.
 */
async function getConfig(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const db: Record<string, string> = {};
  for (const row of data || []) db[row.key] = row.value;
  return {
    evolution_api_url: db.evolution_api_url || Deno.env.get("EVOLUTION_API_URL") || "",
    evolution_api_key: db.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY") || "",
    wa_webhook_secret: db.wa_webhook_secret || Deno.env.get("WA_WEBHOOK_SECRET") || "",
    anti_ban_delay_min: db.anti_ban_delay_min || "2",
    anti_ban_delay_max: db.anti_ban_delay_max || "4",
  };
}

/**
 * wa-send-message: Send a WhatsApp message via Evolution API
 * 
 * Body: { instance_name, phone_number, message, conversation_id?, sender? }
 * 
 * Now uses Dynamic Config Engine — reads API URL/key from platform_settings,
 * falls back to env secrets.
 */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth: accept either Bearer token (admin dashboard) or webhook secret (internal call)
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = req.headers.get("X-Webhook-Secret");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load dynamic config
    const cfg = await getConfig(supabaseAdmin);

    if (!cfg.evolution_api_url || !cfg.evolution_api_key) {
      throw new Error("Evolution API not configured. Set evolution_api_url and evolution_api_key in Settings or as secrets.");
    }

    let isAuthenticated = false;

    if (webhookSecret && cfg.wa_webhook_secret && webhookSecret === cfg.wa_webhook_secret) {
      isAuthenticated = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
        if (isAdmin) isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance_name, phone_number, message, conversation_id, sender } = await req.json();
    if (!instance_name || !phone_number || !message) {
      throw new Error("instance_name, phone_number, and message are required");
    }

    const normalizedPhone = phone_number.replace(/\D/g, "");
    const baseUrl = cfg.evolution_api_url.replace(/\/$/, "");
    const apiKey = cfg.evolution_api_key;

    // 1. Send typing indicator (composing)
    try {
      await fetch(`${baseUrl}/chat/presence/${instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: normalizedPhone,
          presence: "composing",
        }),
      });
    } catch (e) {
      console.warn("Typing indicator failed (non-critical):", e);
    }

    // 2. Anti-ban delay from dynamic config
    const delayMin = parseFloat(cfg.anti_ban_delay_min) * 1000;
    const delayMax = parseFloat(cfg.anti_ban_delay_max) * 1000;
    const delay = delayMin + Math.random() * (delayMax - delayMin);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 3. Send message
    const sendRes = await fetch(`${baseUrl}/message/sendText/${instance_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: normalizedPhone,
        text: message,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Evolution API send error:", sendRes.status, errText);
      throw new Error(`Failed to send message: ${sendRes.status}`);
    }

    const sendData = await sendRes.json();

    // 4. Log message to wa_messages if conversation_id provided
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
