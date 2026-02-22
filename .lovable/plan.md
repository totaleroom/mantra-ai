

# Fase 1: Context Memory + Media Handling

## Task 1: Context Memory (Chat History ke AI)

### Masalah
Baris 341-346 di `wa-webhook/index.ts` hanya mengirim 1 pesan ke AI. Bot tidak ingat percakapan sebelumnya.

### Solusi
Setelah menyimpan pesan USER (baris 247), fetch 10 pesan terakhir dari `wa_messages` untuk conversation ini, lalu format sebagai array `messages` untuk AI.

Perubahan di `wa-webhook/index.ts`:

1. Setelah baris 247 (save incoming message), tambahkan fetch history:
```text
// Fetch last 10 messages for context memory
const { data: chatHistory } = await supabaseAdmin
  .from("wa_messages")
  .select("sender, content")
  .eq("conversation_id", conversation.id)
  .order("created_at", { ascending: true })
  .limit(10);
```

2. Buat helper function `buildChatMessages()` yang mengkonversi history ke format OpenAI:
   - sender "USER" -> `{ role: "user", content: ... }`
   - sender "AI" -> `{ role: "assistant", content: ... }`
   - sender "ADMIN" -> `{ role: "assistant", content: "[Admin] ..." }`

3. Ganti baris 341-346 dari:
```text
messages: [
  { role: "system", content: systemPrompt },
  { role: "user", content: messageText },
]
```
Menjadi:
```text
messages: [
  { role: "system", content: systemPrompt },
  ...historyMessages,  // 10 pesan terakhir termasuk pesan saat ini
]
```

### Hasil
Bot akan ingat konteks percakapan. Contoh:
- User: "Berapa harga kue ultah?" -> Bot: "200rb"
- User: "Kalau yang coklat?" -> Bot tahu ini tentang kue ultah coklat, bukan coklat biasa

---

## Task 2: Media Handling (Image Support)

### Masalah
Baris 120-127 hanya extract text. Jika customer kirim foto, `messageText` kosong dan webhook return `"no_text"`. Foto diabaikan.

### Solusi

#### 2a. Tambah kolom `media_url` di `wa_messages`

Migration SQL:
```text
ALTER TABLE wa_messages ADD COLUMN media_url text DEFAULT NULL;
ALTER TABLE wa_messages ADD COLUMN media_type text DEFAULT NULL;
```

#### 2b. Update webhook untuk handle `imageMessage`

Perubahan di `wa-webhook/index.ts`:

1. Setelah extract `messageText` (baris 120-121), tambahkan deteksi media:
```text
const imageMsg = messageData.message?.imageMessage;
const hasImage = !!imageMsg;
const imageCaption = imageMsg?.caption || "";
```

2. Ubah kondisi "no_text" (baris 123-127): skip hanya jika TIDAK ada text DAN TIDAK ada image.

3. Jika ada image:
   - Download dari Evolution API: `GET {baseUrl}/chat/getBase64FromMediaMessage/{instanceName}` dengan body `{ message: messageData }`
   - Upload base64 ke Supabase Storage bucket `knowledge` dengan path `media/{conversationId}/{timestamp}.jpg`
   - Dapatkan public/signed URL
   - Simpan URL di `wa_messages.media_url`

4. Saat kirim ke AI, jika ada image + model mendukung vision (gemini-2.5-flash/pro), kirim sebagai multimodal message:
```text
{
  role: "user",
  content: [
    { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } },
    { type: "text", text: imageCaption || "Customer mengirim gambar ini" }
  ]
}
```

5. Jika model tidak mendukung vision, balas dengan: "Terima kasih sudah mengirim gambar. Saat ini saya belum bisa melihat gambar, tapi silakan jelaskan kebutuhan Anda dalam bentuk teks."

#### 2c. Update `wa_messages` di InboxChat.tsx

Tampilkan gambar di chat admin jika `media_url` ada:
- Render `<img>` di dalam bubble chat
- Tampilkan caption di bawah gambar

---

## Ringkasan File

| File | Aksi |
|------|------|
| Migration SQL baru | `ALTER TABLE wa_messages ADD COLUMN media_url, media_type` |
| `supabase/functions/wa-webhook/index.ts` | Chat history + image download/upload + multimodal AI |
| `src/components/admin/InboxChat.tsx` | Render gambar di chat bubble |

### Urutan Implementasi:
1. Migration: tambah kolom `media_url` dan `media_type`
2. Update wa-webhook: chat history (Task 1)
3. Update wa-webhook: image handling (Task 2)
4. Update InboxChat: render media

### Catatan Penting:
- Chat history di-limit 10 pesan agar tidak melebihi token limit AI
- Image di-download segera dan disimpan di Supabase Storage (bukan link WA yang expire)
- Model default `gemini-2.5-flash-lite` sudah mendukung vision/multimodal
- Tidak perlu VPS untuk implementasi ini -- semua berjalan di edge function

