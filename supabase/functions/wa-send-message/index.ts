import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * wa-send-message: Send a WhatsApp message via Evolution API
 * 
 * Body: { instance_name, phone_number, message, conversation_id?, sender? }
 * 
 * - Sends typing indicator (composing) for 2-4 seconds
 * - Sends text message
 * - Optionally logs to wa_messages if conversation_id + sender provided
 */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API not configured. Set EVOLUTION_API_URL and EVOLUTION_API_KEY secrets.");
    }

    // Auth: accept either Bearer token (admin dashboard) or webhook secret (internal call)
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = req.headers.get("X-Webhook-Secret");
    const WA_WEBHOOK_SECRET = Deno.env.get("WA_WEBHOOK_SECRET");

    let isAuthenticated = false;

    if (webhookSecret && WA_WEBHOOK_SECRET && webhookSecret === WA_WEBHOOK_SECRET) {
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

    // Normalize phone number (remove + and non-digits)
    const normalizedPhone = phone_number.replace(/\D/g, "");

    // 1. Send typing indicator (composing)
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
    
    try {
      await fetch(`${baseUrl}/chat/presence/${instance_name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: normalizedPhone,
          presence: "composing",
        }),
      });
    } catch (e) {
      console.warn("Typing indicator failed (non-critical):", e);
    }

    // 2. Random delay 2-4 seconds (anti-ban SOP)
    const delay = 2000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 3. Send message
    const sendRes = await fetch(`${baseUrl}/message/sendText/${instance_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
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
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
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
