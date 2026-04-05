import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Dynamic Config Engine: reads from platform_settings first, fallback to env.
 * Single source of truth for all API connections.
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
    ai_system_prompt: db.ai_system_prompt || "",
    ai_model: db.ai_model || "",
    ai_temperature: db.ai_temperature || "0.3",
    ai_max_tokens: db.ai_max_tokens || "1024",
    history_length: db.history_length || "10",
    history_char_limit: db.history_char_limit || "3000",
    rag_result_count: db.rag_result_count || "3",
    sector_detection: db.sector_detection || "true",
    no_rag_action: db.no_rag_action || "escalate",
    no_rag_message: db.no_rag_message || "",
    escalation_keyword: db.escalation_keyword || "ESKALASI_HUMAN",
    escalation_message: db.escalation_message || "",
    anti_ban_delay_min: db.anti_ban_delay_min || "2",
    anti_ban_delay_max: db.anti_ban_delay_max || "4",
  };
}

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

function buildChatMessages(history: { sender: string; content: string; media_url?: string | null }[]): any[] {
  return history.map((msg) => {
    if (msg.sender === "USER") {
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

function trimHistoryByCharLimit(messages: any[], maxChars: number = 3000): any[] {
  if (messages.length === 0) return messages;

  const getTextLength = (content: any): number => {
    if (typeof content === "string") return content.length;
    if (Array.isArray(content)) {
      return content
        .filter((p: any) => p.type === "text")
        .reduce((sum: number, p: any) => sum + (p.text?.length || 0), 0);
    }
    return 0;
  };

  let totalChars = messages.reduce((sum: number, m: any) => sum + getTextLength(m.content), 0);

  if (totalChars <= maxChars) return messages;

  const trimmed = [...messages];
  const originalCount = trimmed.length;

  while (totalChars > maxChars && trimmed.length > 1) {
    const removed = trimmed.shift()!;
    totalChars -= getTextLength(removed.content);
  }

  console.warn(`Chat history trimmed from ${originalCount} to ${trimmed.length} messages (${totalChars} chars)`);
  return trimmed;
}

// Config-aware: receives API URL/key from dynamic config
async function downloadMediaBase64(messageData: any, instanceName: string, cfg: Record<string, string>): Promise<string | null> {
  try {
    const baseUrl = cfg.evolution_api_url.replace(/\/$/, "");
    const apiKey = cfg.evolution_api_key;
    if (!baseUrl || !apiKey) return null;

    const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
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

    const { data: signedData } = await supabase.storage
      .from("knowledge")
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return signedData?.signedUrl || null;
  } catch (e) {
    console.error("Storage upload failed:", e);
    return null;
  }
}

function normalizeEventName(event: string | undefined): string {
  if (!event) return "";
  const lower = event.toLowerCase().replace(/_/g, ".");
  if (lower === "diagnostic.ping") return "diagnostic.ping";
  if (lower.includes("qrcode") || lower === "qr" || lower === "qr.updated") return "qrcode.updated";
  if (lower.includes("connection")) return "connection.update";
  if (lower.includes("messages.upsert") || lower === "messages_upsert") return "messages.upsert";
  return lower;
}

function extractQrFromWebhook(body: any): string | null {
  const data = body.data || body;
  if (typeof data === "string" && data.length > 20) return data;
  if (data?.base64) return data.base64;
  if (data?.code) return data.code;
  if (data?.qrcode?.base64) return data.qrcode.base64;
  if (data?.qrcode?.code) return data.qrcode.code;
  if (data?.qrcode && typeof data.qrcode === "string") return data.qrcode;
  if (data?.pairingCode) return data.pairingCode;
  if (body.qrcode?.base64) return body.qrcode.base64;
  if (body.qrcode?.code) return body.qrcode.code;
  if (body.base64) return body.base64;
  if (body.code && typeof body.code === "string" && body.code.length > 10) return body.code;
  return null;
}

function mapConnectionState(state: string | undefined): "connected" | "connecting" | "disconnected" | "error" {
  if (!state) return "disconnected";
  const lower = state.toLowerCase();
  if (lower === "open" || lower === "connected") return "connected";
  if (lower === "connecting" || lower === "qr" || lower === "pairingcode") return "connecting";
  if (lower === "close" || lower === "disconnected") return "disconnected";
  return "error";
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
    const body = await req.json();
    const rawEvent = body.event || body.type;
    const event = normalizeEventName(rawEvent);
    const instanceName = body.instance || body.instanceName;

    // Create admin client early so we can read dynamic config
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === Dynamic Config: DB first, env fallback ===
    const cfg = await getConfig(supabaseAdmin);

    // Verify webhook secret using dynamic config
    const receivedSecret = req.headers.get("X-Webhook-Secret") || 
      new URL(req.url).searchParams.get("secret");
    
    if (cfg.wa_webhook_secret && receivedSecret !== cfg.wa_webhook_secret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Handle DIAGNOSTIC PING ===
    if (event === "diagnostic.ping") {
      const pingId = body.data?.ping_id || body.ping_id;
      console.log("Diagnostic ping received:", pingId);
      await supabaseAdmin.from("wa_ops_logs").insert({
        instance_name: instanceName || "_diagnostic",
        action: "diagnostic.ping",
        status: "ok",
        metadata: { ping_id: pingId, received_at: new Date().toISOString() },
      });
      return new Response(JSON.stringify({ status: "pong", ping_id: pingId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Update heartbeat ===
    if (instanceName) {
      await supabaseAdmin
        .from("wa_sessions")
        .update({ last_webhook_event_at: new Date().toISOString() })
        .eq("instance_name", instanceName);
    }

    // === Handle CONNECTION_UPDATE ===
    if (event === "connection.update") {
      const state = body.data?.state || body.data?.status || body.data?.action;
      console.log("Connection update:", instanceName, state);

      if (instanceName && state) {
        const dbStatus = mapConnectionState(state);
        const updatePayload: any = { status: dbStatus };
        
        if (dbStatus === "connected") {
          updatePayload.qr_code = null;
          updatePayload.last_error = null;
        } else if (dbStatus === "error") {
          updatePayload.last_error = `Connection state: ${state}`;
        }

        await supabaseAdmin
          .from("wa_sessions")
          .update(updatePayload)
          .eq("instance_name", instanceName);
      }

      await supabaseAdmin.from("wa_ops_logs").insert({
        instance_name: instanceName,
        action: "connection.update",
        status: state || "unknown",
        metadata: { raw_event: rawEvent, state },
      });

      return new Response(JSON.stringify({ status: "connection_updated", state }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Handle QRCODE_UPDATED ===
    if (event === "qrcode.updated") {
      const qrCode = extractQrFromWebhook(body);
      console.log("QR code event for:", instanceName, "has_qr:", !!qrCode);

      if (instanceName) {
        if (qrCode) {
          await supabaseAdmin
            .from("wa_sessions")
            .update({ 
              qr_code: typeof qrCode === "string" ? qrCode : JSON.stringify(qrCode), 
              status: "connecting",
              last_error: null,
            })
            .eq("instance_name", instanceName);
        } else {
          console.warn("QR event received but no QR data found. Payload keys:", Object.keys(body.data || body));
          await supabaseAdmin.from("wa_ops_logs").insert({
            instance_name: instanceName,
            action: "qrcode.updated",
            status: "empty_qr",
            error_message: "QR event received but no QR data extracted",
            metadata: { payload_keys: Object.keys(body.data || {}), raw_event: rawEvent },
          });
        }
      }

      return new Response(JSON.stringify({ status: "qr_updated", has_qr: !!qrCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Only process messages.upsert ===
    if (event !== "messages.upsert") {
      if (rawEvent) {
        console.log("Unhandled event:", rawEvent, "normalized:", event, "instance:", instanceName);
        await supabaseAdmin.from("wa_ops_logs").insert({
          instance_name: instanceName,
          action: "unhandled_event",
          status: "ignored",
          metadata: { raw_event: rawEvent, normalized: event },
        });
      }
      return new Response(JSON.stringify({ status: "ignored", event: rawEvent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const messageText = messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || "";
    
    const imageMsg = messageData.message?.imageMessage;
    const hasImage = !!imageMsg;
    const imageCaption = imageMsg?.caption || "";

    if (!messageText.trim() && !hasImage) {
      return new Response(JSON.stringify({ status: "no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveText = messageText.trim() || imageCaption.trim();
    const pushName = messageData.pushName || "";

    // 1. Find client_id from wa_sessions
    const { data: sessionData } = await supabaseAdmin
      .from("wa_sessions")
      .select("client_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    let clientId = sessionData?.client_id;
    if (!clientId) {
      const { data: sessionById } = await supabaseAdmin
        .from("wa_sessions")
        .select("client_id")
        .eq("id", instanceName)
        .maybeSingle();
      clientId = sessionById?.client_id;
    }
    if (!clientId) {
      const { data: anySession } = await supabaseAdmin
        .from("wa_sessions")
        .select("client_id")
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      clientId = anySession?.client_id;
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

    // 5. Handle media (config-aware)
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (hasImage) {
      mediaType = "image";
      const base64 = await downloadMediaBase64(messageData, instanceName, cfg);
      if (base64) {
        mediaUrl = await uploadMediaToStorage(supabaseAdmin, base64, conversation!.id, "image");
      }
    }

    // 6. Save incoming USER message
    const messageContent = effectiveText || (hasImage ? "[Gambar]" : "");
    await supabaseAdmin.from("wa_messages").insert({
      conversation_id: conversation!.id,
      sender: "USER",
      content: messageContent,
      media_url: mediaUrl,
      media_type: mediaType,
    });

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

    // === AI HANDLING (all config from dynamic cfg) ===
    const historyLength = parseInt(cfg.history_length);
    const charLimit = parseInt(cfg.history_char_limit);
    const ragLimit = parseInt(cfg.rag_result_count);
    const useSectorDetection = cfg.sector_detection !== "false";
    const noRagAction = cfg.no_rag_action;
    const escalationKeyword = cfg.escalation_keyword;

    const { data: chatHistory } = await supabaseAdmin
      .from("wa_messages")
      .select("sender, content, media_url")
      .eq("conversation_id", conversation!.id)
      .order("created_at", { ascending: true })
      .limit(historyLength);

    const historyMessages = buildChatMessages(chatHistory || []);
    const trimmedMessages = trimHistoryByCharLimit(historyMessages, charLimit);

    const searchText = effectiveText || "";
    const roleTag = useSectorDetection && searchText ? detectSector(searchText) : null;

    let contextChunks: any[] = [];
    if (searchText) {
      const { data: results } = await supabaseAdmin.rpc("search_documents", {
        p_client_id: clientId,
        p_query: searchText,
        p_limit: ragLimit,
        p_role_tag: roleTag,
      });
      contextChunks = results || [];

      if (contextChunks.length === 0 && roleTag !== null) {
        const { data: globalResults } = await supabaseAdmin.rpc("search_documents", {
          p_client_id: clientId,
          p_query: searchText,
          p_limit: ragLimit,
        });
        contextChunks = globalResults || [];
      }
    }

    if (contextChunks.length === 0) {
      const { data: fallback } = await supabaseAdmin
        .from("documents")
        .select("id, content, file_name, chunk_index")
        .eq("client_id", clientId)
        .eq("status", "ready")
        .not("content", "is", null)
        .order("created_at", { ascending: false })
        .limit(ragLimit);
      contextChunks = fallback || [];
    }

    if (contextChunks.length === 0) {
      if (noRagAction === "answer_without") {
        console.log("No RAG context found, answering without context (configured)");
      } else if (noRagAction === "custom_message") {
        const customMsg = (cfg.no_rag_message || "Maaf, saya belum bisa menjawab pertanyaan ini.").replace(/^"|"$/g, "");
        await sendWhatsAppMessage(phoneNumber, customMsg, instanceName, cfg);
        await supabaseAdmin.from("wa_messages").insert({
          conversation_id: conversation!.id,
          sender: "AI",
          content: customMsg,
        });
        return new Response(
          JSON.stringify({ status: "custom_no_rag_reply" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName, cfg);
        return new Response(
          JSON.stringify({ status: "escalated_no_knowledge" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
    const aiTemperature = parseFloat(cfg.ai_temperature);
    const aiMaxTokens = parseInt(cfg.ai_max_tokens);

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
            ...trimmedMessages,
          ],
          temperature: aiTemperature,
          max_tokens: aiMaxTokens,
        }),
      }
    );

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName, cfg);
      return new Response(
        JSON.stringify({ status: "escalated_ai_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content?.trim() || "";

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

    if (answer.includes(escalationKeyword)) {
      await escalateToHuman(supabaseAdmin, conversation!.id, phoneNumber, instanceName, cfg);
      return new Response(
        JSON.stringify({ status: "escalated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendWhatsAppMessage(phoneNumber, answer, instanceName, cfg);

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

// Config-aware: receives API URL/key + delay settings from dynamic config
async function sendWhatsAppMessage(phoneNumber: string, message: string, instanceName: string, cfg: Record<string, string>) {
  const normalizedPhone = phoneNumber.replace(/\D/g, "");
  const delayMin = parseFloat(cfg.anti_ban_delay_min || "2") * 1000;
  const delayMax = parseFloat(cfg.anti_ban_delay_max || "4") * 1000;

  // Determine provider from config
  const provider = cfg.wa_provider || "evolution";

  if (provider === "wwebjs") {
    const baseUrl = (cfg.wwebjs_api_url || "").replace(/\/$/, "");
    const token = cfg.wwebjs_api_key || "";
    if (!baseUrl) { console.error("WWebJS API not configured"); return; }

    await new Promise((r) => setTimeout(r, delayMin + Math.random() * (delayMax - delayMin)));

    const res = await fetch(`${baseUrl}/send?session=${encodeURIComponent(instanceName)}&token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: normalizedPhone, text: message }),
    });
    if (!res.ok) { const errText = await res.text(); console.error("WWebJS send error:", res.status, errText); }

  } else if (provider === "n8n" || provider === "custom") {
    const sendUrl = (cfg.custom_send_url || cfg.n8n_webhook_url || "").replace(/\/$/, "");
    if (!sendUrl) { console.error("Custom provider not configured"); return; }

    await new Promise((r) => setTimeout(r, delayMin + Math.random() * (delayMax - delayMin)));

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.custom_auth_header) headers["Authorization"] = cfg.custom_auth_header;

    const res = await fetch(sendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: normalizedPhone, message, instance_name: instanceName }),
    });
    if (!res.ok) { const errText = await res.text(); console.error("Custom send error:", res.status, errText); }

  } else {
    // Evolution API (default)
    const baseUrl = cfg.evolution_api_url.replace(/\/$/, "");
    const apiKey = cfg.evolution_api_key;
    if (!baseUrl || !apiKey) { console.error("Evolution API not configured"); return; }

    try {
      await fetch(`${baseUrl}/chat/presence/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number: normalizedPhone, presence: "composing" }),
      });
    } catch (e) { console.warn("Typing indicator failed:", e); }

    await new Promise((r) => setTimeout(r, delayMin + Math.random() * (delayMax - delayMin)));

    const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });
    if (!res.ok) { const errText = await res.text(); console.error("Evolution send error:", res.status, errText); }
  }
}

async function escalateToHuman(
  supabase: any,
  conversationId: string,
  phoneNumber: string,
  instanceName: string,
  cfg: Record<string, string>
) {
  await supabase
    .from("wa_conversations")
    .update({ handled_by: "HUMAN", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const escalationMsg = (cfg.escalation_message || "Mohon tunggu kak, saya sedang menyambungkan dengan Admin kami. 🙏").replace(/^"|"$/g, "");
  await sendWhatsAppMessage(phoneNumber, escalationMsg, instanceName, cfg);

  await supabase.from("wa_messages").insert({
    conversation_id: conversationId,
    sender: "AI",
    content: escalationMsg,
  });
}
