import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Detect sector/role_tag from message keywords for targeted RAG search.
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
 * Build chat messages from history for context memory.
 * Converts wa_messages rows to OpenAI-compatible message format.
 */
function buildChatMessages(history: { sender: string; content: string; media_url?: string | null }[]): any[] {
  return history.map((msg) => {
    if (msg.sender === "USER") {
      // If message has media, build multimodal content
      if (msg.media_url) {
        const parts: any[] = [
          { type: "image_url", image_url: { url: msg.media_url } },
        ];
        if (msg.content) {
          parts.push({ type: "text", text: msg.content });
        } else {
          parts.push({ type: "text", text: "Customer mengirim gambar ini" });
        }
        return { role: "user", content: parts };
      }
      return { role: "user", content: msg.content };
    } else if (msg.sender === "AI") {
      return { role: "assistant", content: msg.content };
    } else if (msg.sender === "ADMIN") {
      return { role: "assistant", content: `[Admin] ${msg.content}` };
    }
    return { role: "user", content: msg.content };
  });
}

/**
 * Download media from Evolution API and return base64 string.
 */
async function downloadMediaBase64(messageData: any, instanceName: string): Promise<string | null> {
  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ message: messageData }),
    });

    if (!res.ok) {
      console.error("Media download error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.base64 || null;
  } catch (e) {
    console.error("Media download failed:", e);
    return null;
  }
}

/**
 * Upload base64 image to Supabase Storage and return signed URL.
 */
async function uploadMediaToStorage(
  supabase: any,
  base64: string,
  conversationId: string,
  mediaType: string
): Promise<string | null> {
  try {
    const ext = mediaType === "video" ? "mp4" : "jpg";
    const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
    const path = `media/${conversationId}/${Date.now()}.${ext}`;

    // Decode base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from("knowledge")
      .upload(path, bytes, { contentType, upsert: false });

    if (error) {
      console.error("Storage upload error:", error.message);
      return null;
    }

    // Create signed URL (valid for 1 year)
    const { data: signedData } = await supabase.storage
      .from("knowledge")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return signedData?.signedUrl || null;
  } catch (e) {
    console.error("Storage upload failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

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
    const event = body.event || body.type;
    
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

    if (messageData.key?.fromMe) {
      return new Response(JSON.stringify({ status: "skipped_outgoing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = messageData.key?.remoteJid || "";
    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    
    if (remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ status: "skipped_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text message
    const messageText = messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || "";
    
    // Detect image message
    const imageMsg = messageData.message?.imageMessage;
    const hasImage = !!imageMsg;
    const imageCaption = imageMsg?.caption || "";

    // Skip only if NO text AND NO image
    if (!messageText.trim() && !hasImage) {
      return new Response(JSON.stringify({ status: "no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Effective text for RAG search (use caption if image, otherwise messageText)
    const effectiveText = messageText.trim() || imageCaption.trim();

    const pushName = messageData.pushName || "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find client_id from wa_sessions
    const { data: session } = await supabaseAdmin
      .from("wa_sessions")
      .select("client_id")
      .eq("id", instanceName)
      .eq("status", "connected")
      .maybeSingle();

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

    // 5. Handle media: download and upload to storage
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (hasImage) {
      mediaType = "image";
      const base64 = await downloadMediaBase64(messageData, instanceName);
      if (base64) {
        mediaUrl = await uploadMediaToStorage(supabaseAdmin, base64, conversation!.id, "image");
      }
    }

    // 6. Save incoming USER message (with media if available)
    const messageContent = effectiveText || (hasImage ? "[Gambar]" : "");
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conversation!.id,
      sender: "USER",
      content: messageContent,
      media_url: mediaUrl,
      media_type: mediaType,
    });

    // Update conversation timestamp
    await supabaseAdmin
      .from("wa_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation!.id);

    // 7. Route based on handled_by
    if (conversation!.handled_by === "HUMAN") {
      return new Response(
        JSON.stringify({ status: "saved_for_human", conversation_id: conversation!.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === AI HANDLING ===

    // Fetch last 10 messages for context memory
    const { data: chatHistory } = await supabaseAdmin
      .from("wa_messages")
      .select("sender, content, media_url")
      .eq("conversation_id", conversation!.id)
      .order("created_at", { ascending: true })
      .limit(10);

    const historyMessages = buildChatMessages(chatHistory || []);

    // Sector-based RAG search
    const searchText = effectiveText || "";
    const roleTag = searchText ? detectSector(searchText) : null;

    let contextChunks: any[] = [];
    if (searchText) {
      const { data: results } = await supabaseAdmin.rpc("search_documents", {
        p_client_id: clientId,
        p_query: searchText,
        p_limit: 3,
        p_role_tag: roleTag,
      });
      contextChunks = results || [];

      // Fallback: retry without role_tag
      if (contextChunks.length === 0 && roleTag !== null) {
        const { data: globalResults } = await supabaseAdmin.rpc("search_documents", {
          p_client_id: clientId,
          p_query: searchText,
          p_limit: 3,
        });
        contextChunks = globalResults || [];
      }
    }

    // Fallback: fetch latest documents directly
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    // Build AI request with context memory (history) instead of single message
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
            ...historyMessages,
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

    if (clientData && clientData.quota_remaining > 0) {
      await supabaseAdmin
        .from("clients")
        .update({ quota_remaining: clientData.quota_remaining - 1 })
        .eq("id", clientId);
    }

    if (answer.includes("ESKALASI_HUMAN")) {
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName);
      return new Response(
        JSON.stringify({ status: "escalated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendWhatsAppMessage(phoneNumber, answer, instanceName);

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

async function sendWhatsAppMessage(phoneNumber: string, message: string, instanceName: string) {
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const normalizedPhone = phoneNumber.replace(/\D/g, "");

  const delayMin = 2000;
  const delayMax = 4000;

  try {
    await fetch(`${baseUrl}/chat/presence/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ number: normalizedPhone, presence: "composing" }),
    });
  } catch (e) {
    console.warn("Typing indicator failed:", e);
  }

  await new Promise((r) => setTimeout(r, delayMin + Math.random() * (delayMax - delayMin)));

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

async function escalateToHuman(
  supabase: any,
  conversationId: string,
  phoneNumber: string,
  instanceName: string
) {
  await supabase
    .from("wa_conversations")
    .update({ handled_by: "HUMAN", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const escalationMsg = "Mohon tunggu kak, saya sedang menyambungkan dengan Admin kami. 🙏";
  await sendWhatsAppMessage(phoneNumber, escalationMsg, instanceName);

  await supabase.from("wa_messages").insert({
    conversation_id: conversationId,
    sender: "AI",
    content: escalationMsg,
  });
}
