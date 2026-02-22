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
    const { document_id } = await req.json();
    if (!document_id) throw new Error("document_id is required");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch document record
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();
    if (docErr || !doc) throw new Error("Document not found: " + docErr?.message);

    const filePath = doc.file_path;
    if (!filePath) throw new Error("No file_path on document");

    // 2. Download file from storage
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("knowledge")
      .download(filePath);
    if (dlErr || !fileData) throw new Error("Download failed: " + dlErr?.message);

    // 3. Extract text
    let text = "";
    const ext = doc.file_name?.split(".").pop()?.toLowerCase();
    if (ext === "txt") {
      text = await fileData.text();
    } else if (ext === "pdf") {
      // Simple PDF text extraction — extract readable text between stream markers
      const raw = await fileData.text();
      // Try to get text from PDF — basic extraction
      const textParts: string[] = [];
      // Match text between BT and ET operators, extract Tj/TJ strings
      const btEtRegex = /BT\s([\s\S]*?)ET/g;
      let match;
      while ((match = btEtRegex.exec(raw)) !== null) {
        const block = match[1];
        const tjRegex = /\(([^)]*)\)\s*Tj/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          textParts.push(tjMatch[1]);
        }
        // TJ array
        const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
        let tjArrMatch;
        while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
          const items = tjArrMatch[1];
          const strRegex = /\(([^)]*)\)/g;
          let strMatch;
          while ((strMatch = strRegex.exec(items)) !== null) {
            textParts.push(strMatch[1]);
          }
        }
      }
      text = textParts.join(" ").replace(/\s+/g, " ").trim();

      // If basic extraction fails, use raw text fallback
      if (!text || text.length < 20) {
        // Fallback: extract any readable ASCII sequences
        const bytes = new Uint8Array(await (await supabaseAdmin.storage.from("knowledge").download(filePath)).data!.arrayBuffer());
        const readable: string[] = [];
        let current = "";
        for (const b of bytes) {
          if (b >= 32 && b <= 126) {
            current += String.fromCharCode(b);
          } else {
            if (current.length > 3) readable.push(current);
            current = "";
          }
        }
        if (current.length > 3) readable.push(current);
        text = readable.join(" ").replace(/\s+/g, " ").trim();
      }
    } else {
      throw new Error("Unsupported file type: " + ext);
    }

    if (!text || text.length < 10) {
      // Mark as error if no text extracted
      await supabaseAdmin
        .from("documents")
        .update({ status: "error", content: "Gagal mengekstrak teks dari file." })
        .eq("id", document_id);
      return new Response(
        JSON.stringify({ error: "No text extracted from file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Chunk text (~500 chars, 50 overlap)
    const CHUNK_SIZE = 500;
    const OVERLAP = 50;
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push(text.slice(start, end));
      start = end - OVERLAP;
      if (start >= text.length) break;
    }

    // 5. Update original doc (chunk_index=0) with first chunk content
    await supabaseAdmin
      .from("documents")
      .update({ content: chunks[0], status: "ready", chunk_index: 0 })
      .eq("id", document_id);

    // 6. Insert remaining chunks
    if (chunks.length > 1) {
      const rows = chunks.slice(1).map((c, i) => ({
        client_id: doc.client_id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        content: c,
        status: "ready",
        chunk_index: i + 1,
      }));
      const { error: insertErr } = await supabaseAdmin
        .from("documents")
        .insert(rows);
      if (insertErr) console.error("Insert chunks error:", insertErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        text_length: text.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
