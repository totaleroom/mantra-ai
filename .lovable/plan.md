

# Integrasi WhatsApp + RAG + LLM — Arsitektur & Rencana MVP

## Kondisi Saat Ini

| Komponen | Status |
|----------|--------|
| Dashboard (Clients, Device, Knowledge Base, Monitoring) | UI siap |
| Database (clients, wa_sessions, documents, message_logs) | Siap + pgvector aktif |
| Storage bucket "knowledge" | Siap |
| Edge functions (process-document, test-rag) | Belum dibuat |
| WhatsApp bridge/server | Belum ada |
| LLM | Lovable AI tersedia (LOVABLE_API_KEY sudah ada) |

---

## Arsitektur Keseluruhan

```text
HP Konsumen (WhatsApp)
        |
        v
WhatsApp Cloud API (Meta) -- gratis 1000 percakapan/bulan
        |
        v (webhook)
Edge Function: wa-webhook
        |
        +---> Cari dokumen relevan (pgvector similarity search)
        +---> Kirim ke Lovable AI (gemini-2.5-flash-lite) --> jawaban
        +---> Kirim balik via WhatsApp Cloud API
        +---> Log ke message_logs + kurangi quota
```

---

## Opsi WhatsApp Integration (Murah/Gratis)

### Opsi 1: Meta WhatsApp Cloud API (REKOMENDASI)

| Aspek | Detail |
|-------|--------|
| Biaya | Gratis 1000 percakapan/bulan (service conversations) |
| Keandalan | Official API, tidak akan di-ban |
| Setup | Perlu Facebook Business account + verifikasi |
| Cocok untuk | Production, MVP, testing |

Langkah setup:
1. Buat akun di [developers.facebook.com](https://developers.facebook.com)
2. Buat app baru -> pilih "Business" -> tambahkan WhatsApp product
3. Dapatkan **Phone Number ID**, **WhatsApp Business Account ID**, dan **Permanent Access Token**
4. Set webhook URL ke edge function kita
5. Nomor test (082125086328) bisa didaftarkan sebagai test number

### Opsi 2: whatsapp-web.js / Baileys (Gratis tapi berisiko)

| Aspek | Detail |
|-------|--------|
| Biaya | Gratis |
| Keandalan | Unofficial, risiko ban dari WhatsApp |
| Setup | Perlu VPS terpisah (Node.js server) |
| Cocok untuk | Prototype saja, TIDAK untuk production |

### Rekomendasi: Opsi 1 (Meta Cloud API)

Untuk testing dengan nomor 082125086328, Meta Cloud API menyediakan sandbox mode gratis.

---

## LLM: Strategi Hemat + Anti-Halusinasi

### Model yang dipakai: `google/gemini-2.5-flash-lite`

| Aspek | Detail |
|-------|--------|
| Biaya | Paling murah di Lovable AI |
| Kecepatan | Paling cepat |
| Cocok untuk | Menjawab pertanyaan berdasarkan konteks dokumen |

### Strategi Anti-Halusinasi (RAG Guardrails)

1. **System prompt ketat**: AI hanya boleh menjawab berdasarkan konteks yang diberikan
2. **Similarity threshold**: Jika skor kesamaan dokumen < 0.7, jangan jawab — balas "Maaf, saya belum punya info tentang itu. Silakan hubungi admin langsung."
3. **Fallback message**: Jika tidak ada dokumen yang relevan, kirim pesan default + nomor admin
4. **Temperature 0**: Tidak ada kreativitas, jawab apa adanya
5. **Max tokens dibatasi**: Jawaban singkat dan padat (max 300 tokens)

System prompt contoh:
```
Kamu adalah asisten customer service untuk {nama_bisnis}.
Jawab HANYA berdasarkan informasi berikut. Jika jawabannya tidak ada di informasi ini, katakan "Maaf kak, untuk pertanyaan ini silakan hubungi admin kami langsung ya."
Gunakan bahasa santai dan ramah seperti chat WhatsApp. Panggil customer "kak".
JANGAN mengarang informasi. JANGAN membuat harga atau produk yang tidak ada di informasi.

INFORMASI:
{konteks_dari_dokumen}
```

---

## RAG Pipeline yang Dibangun

### Edge Function 1: `process-document`

Dipanggil setelah file di-upload ke storage.

```text
File PDF/TXT di storage
    |
    v
Parse teks (PDF -> text)
    |
    v
Chunking (split per ~500 karakter dengan overlap 50)
    |
    v
Embedding via Lovable AI (gemini model)
    |
    v
Simpan ke tabel documents (content, embedding, chunk_index)
    |
    v
Update status -> "ready"
```

Catatan: Karena Lovable AI tidak menyediakan embedding API secara langsung, kita akan menggunakan pendekatan alternatif — simpan teks chunks saja tanpa vector embedding, lalu gunakan keyword search (full-text search PostgreSQL) sebagai MVP. Ini lebih sederhana dan gratis.

### Edge Function 2: `test-rag`

Dipanggil dari dashboard Test Bot dan dari wa-webhook.

```text
Pertanyaan masuk
    |
    v
Full-text search di tabel documents (filter by client_id)
    |
    v
Ambil top 3 chunks paling relevan
    |
    v
Kirim ke Lovable AI (gemini-2.5-flash-lite) dengan system prompt ketat
    |
    v
Return jawaban
```

### Edge Function 3: `wa-webhook`

Menerima pesan masuk dari WhatsApp Cloud API.

```text
Webhook POST dari Meta
    |
    v
Validasi signature
    |
    v
Cek client_id dari nomor WA terdaftar
    |
    v
Cek quota_remaining > 0
    |  (jika habis -> balas "Maaf, silakan hubungi admin")
    v
Panggil RAG pipeline (sama seperti test-rag)
    |
    v
Kirim jawaban via WhatsApp Cloud API
    |
    v
Update message_logs + kurangi quota
```

---

## MVP yang Bisa Langsung Dibangun (Tanpa WhatsApp Dulu)

Jika setup Meta WhatsApp Cloud API belum siap, kita bisa bangun dan test semuanya dari dashboard dulu:

### Fase 1: Backend RAG (bisa langsung)

1. **Edge function `process-document`**: Parse file, chunking, simpan ke database
2. **Edge function `test-rag`**: Full-text search + Lovable AI untuk jawab pertanyaan
3. **Test dari dashboard**: Upload dokumen -> test bot -> validasi jawaban

### Fase 2: WhatsApp Integration (setelah Meta API siap)

4. **Edge function `wa-webhook`**: Terima pesan, panggil RAG, balas via API
5. **Update DeviceManager**: Tampilkan status koneksi dari Meta Cloud API
6. **Monitoring**: Log semua pesan dan token usage

---

## Error Handling & Fallback MVP

| Skenario Error | Fallback |
|----------------|----------|
| LLM gagal/timeout | Balas: "Maaf kak, sistem sedang sibuk. Coba lagi ya." |
| Tidak ada dokumen relevan | Balas: "Maaf kak, saya belum punya info itu. Hubungi admin di [nomor]." |
| Quota habis | Balas: "Maaf kak, layanan otomatis sedang tidak tersedia. Hubungi [nomor]." |
| Rate limit (429) | Retry 1x setelah 2 detik, lalu fallback message |
| Dokumen gagal diproses | Update status ke "error", tampilkan di dashboard |

---

## Rencana Implementasi (Fase 1 — Langsung Bisa Dikerjakan)

| # | Task | File |
|---|------|------|
| 1 | Tambah kolom `ts_content` (tsvector) ke tabel documents untuk full-text search | Migration SQL |
| 2 | Buat edge function `process-document` (parse, chunk, simpan) | `supabase/functions/process-document/index.ts` |
| 3 | Buat edge function `test-rag` (search + LLM) | `supabase/functions/test-rag/index.ts` |
| 4 | Update `supabase/config.toml` untuk register kedua functions | `supabase/config.toml` |
| 5 | Test upload dokumen + test bot dari dashboard | Verify end-to-end |

### Fase 2 (Setelah Meta API Ready)

| # | Task | File |
|---|------|------|
| 6 | Buat edge function `wa-webhook` | `supabase/functions/wa-webhook/index.ts` |
| 7 | Tambah secrets: META_WA_TOKEN, META_PHONE_NUMBER_ID, META_VERIFY_TOKEN | Secrets |
| 8 | Update DeviceManager UI untuk Meta Cloud API flow | `src/pages/admin/DeviceManager.tsx` |

---

## Yang Perlu Kamu Siapkan

Untuk **Fase 1** (RAG): Tidak perlu apa-apa, langsung bisa dikerjakan karena Lovable AI sudah tersedia.

Untuk **Fase 2** (WhatsApp): Perlu buat akun di [Meta for Developers](https://developers.facebook.com) dan setup WhatsApp Business API. Saya akan bantu panduan langkah-langkahnya nanti.

