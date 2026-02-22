import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { client_id, question } = await req.json();
    if (!client_id || !question) throw new Error("client_id and question are required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get client name
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("name")
      .eq("id", client_id)
      .single();
    const businessName = client?.name || "Bisnis Kami";

    // 2. Full-text search documents
    const { data: results, error: searchErr } = await supabaseAdmin.rpc(
      "search_documents",
      { p_client_id: client_id, p_query: question, p_limit: 3 }
    );

    if (searchErr) {
      console.error("Search error:", searchErr);
    }

    // 3. If no results, try fallback: get latest documents for this client
    let contextChunks = results || [];
    if (contextChunks.length === 0) {
      const { data: fallback } = await supabaseAdmin
        .from("documents")
        .select("id, content, file_name, chunk_index")
        .eq("client_id", client_id)
        .eq("status", "ready")
        .not("content", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      contextChunks = fallback || [];
    }

    // 4. If still no documents, return fallback message
    if (contextChunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer:
            "Maaf kak, belum ada informasi yang tersedia untuk pertanyaan ini. Silakan hubungi admin kami langsung ya.",
          sources: [],
          has_context: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Build context
    const context = contextChunks
      .map((c: any) => c.content)
      .filter(Boolean)
      .join("\n\n---\n\n");

    // 6. Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Kamu adalah asisten customer service untuk ${businessName}.
Jawab HANYA berdasarkan informasi berikut. Jika jawabannya tidak ada di informasi ini, katakan "Maaf kak, untuk pertanyaan ini silakan hubungi admin kami langsung ya."
Gunakan bahasa santai dan ramah seperti chat WhatsApp. Panggil customer "kak".
JANGAN mengarang informasi. JANGAN membuat harga atau produk yang tidak ada di informasi.
Jawab singkat dan padat.

INFORMASI:
${context}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0,
          max_tokens: 300,
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ answer: "Maaf kak, sistem sedang sibuk. Coba lagi dalam beberapa saat ya.", sources: [], has_context: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ answer: "Maaf kak, layanan sedang tidak tersedia. Hubungi admin ya.", sources: [], has_context: true }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI gateway error: " + status);
    }

    const aiData = await aiResponse.json();
    const answer =
      aiData.choices?.[0]?.message?.content ||
      "Maaf kak, sistem sedang sibuk. Coba lagi ya.";

    // 7. Log usage
    const tokenUsage =
      (aiData.usage?.prompt_tokens || 0) + (aiData.usage?.completion_tokens || 0);

    // Upsert message_log for today
    const today = new Date().toISOString().split("T")[0];
    const { data: existingLog } = await supabaseAdmin
      .from("message_logs")
      .select("id, message_count, token_usage")
      .eq("client_id", client_id)
      .eq("log_date", today)
      .maybeSingle();

    if (existingLog) {
      await supabaseAdmin
        .from("message_logs")
        .update({
          message_count: existingLog.message_count + 1,
          token_usage: existingLog.token_usage + tokenUsage,
        })
        .eq("id", existingLog.id);
    } else {
      await supabaseAdmin.from("message_logs").insert({
        client_id,
        log_date: today,
        message_count: 1,
        token_usage: tokenUsage,
      });
    }

    // Decrease quota
    const { data: clientData } = await supabaseAdmin
      .from("clients")
      .select("quota_remaining")
      .eq("id", client_id)
      .single();
    if (clientData && clientData.quota_remaining > 0) {
      await supabaseAdmin
        .from("clients")
        .update({ quota_remaining: clientData.quota_remaining - 1 })
        .eq("id", client_id);
    }

    return new Response(
      JSON.stringify({
        answer,
        sources: contextChunks.map((c: any) => ({
          file_name: c.file_name,
          chunk_index: c.chunk_index,
        })),
        has_context: true,
        token_usage: tokenUsage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("test-rag error:", e);
    return new Response(
      JSON.stringify({
        answer: "Maaf kak, sistem sedang error. Coba lagi ya.",
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
