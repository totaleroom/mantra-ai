import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Detect sector/role_tag from message keywords for targeted RAG search.
 * Returns 'WAREHOUSE', 'OWNER', or null (fallback to all documents).
 */
function detectSector(message: string): string | null {
  const lower = message.toLowerCase();

  const warehouseKeywords = [
    'stok', 'sisa', 'habis', 'gudang', 'bahan baku', 'expired',
    'pengiriman', 'ekspedisi', 'resi', 'packing', 'bikin', 'proses',
    'antri', 'slot', 'jadwal', 'booking', 'penuh', 'unit', 'available',
  ];

  const ownerKeywords = [
    'harga', 'diskon', 'discount', 'promo', 'voucher', 'cod',
    'bayar', 'transfer', 'policy', 'kebijakan', 'refund', 'retur',
    'komplain', 'owner', 'bos', 'cicilan', 'kpr', 'dp', 'nego',
  ];

  for (const kw of warehouseKeywords) {
    if (kw.includes(' ') ? lower.includes(kw) : new RegExp(`\\b${kw}\\b`).test(lower)) {
      return 'WAREHOUSE';
    }
  }
  for (const kw of ownerKeywords) {
    if (new RegExp(`\\b${kw}\\b`).test(lower)) {
      return 'OWNER';
    }
  }
  return null;
}

/**
 * wa-webhook: Receives incoming WhatsApp messages from Evolution API
 * 
 * Evolution API sends webhooks for various events. We handle "messages.upsert".
 * 
 * Flow:
 * 1. Verify webhook secret
 * 2. Extract phone number + message
 * 3. Lookup client from wa_sessions by instance name
 * 4. Lookup/create wa_customer
 * 5. Lookup/create wa_conversation
 * 6. If handled_by=AI -> RAG + reply; If HUMAN -> save only
 * 7. If AI returns ESKALASI_HUMAN -> escalate
 */
serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify webhook secret
    const WA_WEBHOOK_SECRET = Deno.env.get("WA_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("X-Webhook-Secret") || 
      new URL(req.url).searchParams.get("secret");
    
    if (WA_WEBHOOK_SECRET && receivedSecret !== WA_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    
    // Evolution API event types: messages.upsert, connection.update, etc.
    const event = body.event || body.type;
    
    // Only process incoming messages
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ status: "ignored", event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceName = body.instance || body.instanceName;
    const messageData = body.data;
    
    if (!messageData) {
      return new Response(JSON.stringify({ status: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if message is from us (outgoing) or is a status update
    if (messageData.key?.fromMe) {
      return new Response(JSON.stringify({ status: "skipped_outgoing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract phone number and message text
    const remoteJid = messageData.key?.remoteJid || "";
    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    
    // Only handle direct messages, not group messages
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ status: "skipped_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageText = messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || "";
    
    if (!messageText.trim()) {
      return new Response(JSON.stringify({ status: "no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pushName = messageData.pushName || "";

    // Setup Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find client_id from wa_sessions by instance name
    const { data: session } = await supabaseAdmin
      .from("wa_sessions")
      .select("client_id")
      .eq("id", instanceName)
      .eq("status", "connected")
      .maybeSingle();

    // Fallback: try matching by client_id directly if instance name is UUID
    let clientId = session?.client_id;
    if (!clientId) {
      const { data: sessionByClient } = await supabaseAdmin
        .from("wa_sessions")
        .select("client_id")
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      clientId = sessionByClient?.client_id;
    }

    if (!clientId) {
      console.error("No connected session found for instance:", instanceName);
      return new Response(JSON.stringify({ error: "No connected session" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check daily message limit
    const { data: clientData } = await supabaseAdmin
      .from("clients")
      .select("name, daily_message_limit, quota_remaining")
      .eq("id", clientId)
      .single();

    const businessName = clientData?.name || "Bisnis Kami";
    const dailyLimit = clientData?.daily_message_limit || 300;

    // Load platform settings for AI config
    const { data: platformSettings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value");
    const cfg: Record<string, string> = {};
    for (const row of platformSettings || []) {
      cfg[row.key] = row.value;
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: todayLog } = await supabaseAdmin
      .from("message_logs")
      .select("message_count")
      .eq("client_id", clientId)
      .eq("log_date", today)
      .maybeSingle();

    if (todayLog && todayLog.message_count >= dailyLimit) {
      console.warn("Daily limit reached for client:", clientId);
      return new Response(JSON.stringify({ status: "daily_limit_reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Lookup/create wa_customer
    let { data: customer } = await supabaseAdmin
      .from("wa_customers")
      .select("id, name")
      .eq("client_id", clientId)
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("wa_customers")
        .insert({ client_id: clientId, phone_number: phoneNumber, name: pushName || null })
        .select("id, name")
        .single();
      if (custErr) throw new Error("Failed to create customer: " + custErr.message);
      customer = newCustomer;
    } else if (!customer.name && pushName) {
      // Update name if we have pushName and customer doesn't have a name yet
      await supabaseAdmin
        .from("wa_customers")
        .update({ name: pushName })
        .eq("id", customer.id);
    }

    // 4. Lookup/create active conversation
    let { data: conversation } = await supabaseAdmin
      .from("wa_conversations")
      .select("id, handled_by")
      .eq("client_id", clientId)
      .eq("customer_id", customer!.id)
      .eq("status", "active")
      .maybeSingle();

    if (!conversation) {
      const { data: newConvo, error: convoErr } = await supabaseAdmin
        .from("wa_conversations")
        .insert({ client_id: clientId, customer_id: customer!.id })
        .select("id, handled_by")
        .single();
      if (convoErr) throw new Error("Failed to create conversation: " + convoErr.message);
      conversation = newConvo;
    }

    // 5. Save incoming USER message
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conversation!.id,
      sender: "USER",
      content: messageText,
    });

    // Update conversation timestamp
    await supabaseAdmin
      .from("wa_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation!.id);

    // 6. Route based on handled_by
    if (conversation!.handled_by === "HUMAN") {
      // Just save the message, admin will see it via realtime
      return new Response(
        JSON.stringify({ status: "saved_for_human", conversation_id: conversation!.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // handled_by === "AI" -> RAG + reply
    // Search documents for context
    // Sector-based RAG: detect role tag from message keywords
    const roleTag = detectSector(messageText);

    const { data: results } = await supabaseAdmin.rpc("search_documents", {
      p_client_id: clientId,
      p_query: messageText,
      p_limit: 3,
      p_role_tag: roleTag,
    });

    let contextChunks = results || [];

    // Fallback 1: If filtered search returned nothing, retry without role_tag
    if (contextChunks.length === 0 && roleTag !== null) {
      const { data: globalResults } = await supabaseAdmin.rpc("search_documents", {
        p_client_id: clientId,
        p_query: messageText,
        p_limit: 3,
      });
      contextChunks = globalResults || [];
    }

    // Fallback 2: If still empty, fetch latest documents directly
    if (contextChunks.length === 0) {
      const { data: fallback } = await supabaseAdmin
        .from("documents")
        .select("id, content, file_name, chunk_index")
        .eq("client_id", clientId)
        .eq("status", "ready")
        .not("content", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      contextChunks = fallback || [];
    }

    // If no documents at all, escalate to human
    if (contextChunks.length === 0) {
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName);
      return new Response(
        JSON.stringify({ status: "escalated_no_knowledge" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const context = contextChunks
      .map((c: any) => c.content)
      .filter(Boolean)
      .join("\n\n---\n\n");

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build system prompt from platform_settings or default
    const rawPrompt = cfg.ai_system_prompt
      ? cfg.ai_system_prompt.replace(/^"|"$/g, "")
      : `Kamu adalah asisten customer service yang ramah dan profesional. Jawab pertanyaan berdasarkan konteks yang diberikan. Jika kamu tidak tahu jawabannya atau pelanggan meminta berbicara dengan manusia, balas HANYA dengan kata ESKALASI_HUMAN.`;

    const systemPrompt = rawPrompt
      .replace("{{business_name}}", businessName)
      .replace("{{context}}", context)
      + `\n\nNama bisnis: ${businessName}\n\nINFORMASI:\n${context}`;

    const aiModel = cfg.ai_model ? cfg.ai_model.replace(/^"|"$/g, "") : "google/gemini-2.5-flash-lite";
    const aiTemperature = parseFloat(cfg.ai_temperature || "0.3");
    const aiMaxTokens = parseInt(cfg.ai_max_tokens || "1024");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: messageText },
          ],
          temperature: aiTemperature,
          max_tokens: aiMaxTokens,
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName);
      return new Response(
        JSON.stringify({ status: "escalated_ai_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content?.trim() || "";

    // Log token usage
    const tokenUsage = (aiData.usage?.prompt_tokens || 0) + (aiData.usage?.completion_tokens || 0);
    
    const { data: existingLog } = await supabaseAdmin
      .from("message_logs")
      .select("id, message_count, token_usage")
      .eq("client_id", clientId)
      .eq("log_date", today)
      .maybeSingle();

    if (existingLog) {
      await supabaseAdmin.from("message_logs").update({
        message_count: existingLog.message_count + 1,
        token_usage: existingLog.token_usage + tokenUsage,
      }).eq("id", existingLog.id);
    } else {
      await supabaseAdmin.from("message_logs").insert({
        client_id: clientId,
        log_date: today,
        message_count: 1,
        token_usage: tokenUsage,
      });
    }

    // Decrease quota
    if (clientData && clientData.quota_remaining > 0) {
      await supabaseAdmin
        .from("clients")
        .update({ quota_remaining: clientData.quota_remaining - 1 })
        .eq("id", clientId);
    }

    // Check for escalation
    if (answer.includes("ESKALASI_HUMAN")) {
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName);
      return new Response(
        JSON.stringify({ status: "escalated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send AI reply via Evolution API
    await sendWhatsAppMessage(phoneNumber, answer, instanceName);

    // Save AI message
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conversation!.id,
      sender: "AI",
      content: answer,
    });

    return new Response(
      JSON.stringify({ status: "replied", conversation_id: conversation!.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("wa-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Send WhatsApp message via Evolution API with typing indicator + delay
 */
async function sendWhatsAppMessage(phoneNumber: string, message: string, instanceName: string) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const normalizedPhone = phoneNumber.replace(/\D/g, "");

  // Read delay config from platform_settings if available
  const delayMin = 2000;
  const delayMax = 4000;

  // Typing indicator
  try {
    await fetch(`${baseUrl}/chat/presence/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizedPhone, presence: "composing" }),
    });
  } catch (e) {
    console.warn("Typing indicator failed:", e);
  }

  // Delay 2-4 seconds
  await new Promise((r) => setTimeout(r, delayMin + Math.random() * (delayMax - delayMin)));

  // Send message
  const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
    body: JSON.stringify({ number: normalizedPhone, text: message }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Evolution send error:", res.status, errText);
  }
}

/**
 * Escalate conversation to HUMAN
 */
async function escalateToHuman(
  supabase: any,
  conversationId: string,
  phoneNumber: string,
  instanceName: string
) {
  // Update conversation to HUMAN
  await supabase
    .from("wa_conversations")
    .update({ handled_by: "HUMAN", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Send escalation message to user
  const escalationMsg = "Mohon tunggu kak, saya sedang menyambungkan dengan Admin kami. 🙏";
  await sendWhatsAppMessage(phoneNumber, escalationMsg, instanceName);

  // Save escalation message
  await supabase.from("wa_messages").insert({
    conversation_id: conversationId,
    sender: "AI",
    content: escalationMsg,
  });
}
