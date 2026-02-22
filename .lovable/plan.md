

# Implementasi Tandem System (AI + Human Handoff) dengan Evolution API

## Ringkasan Perubahan dari Prompt Sebelumnya

Karena Meta WhatsApp Official API sulit didapatkan, sekarang menggunakan **Evolution API** (open-source REST API wrapper untuk WhatsApp Web). Ini selaras dengan fitur QR Code scan yang sudah ada di DeviceManager.

---

## Fase 1: Database Schema Baru

Buat 3 tabel baru + tambah kolom `role_tag` di tabel `documents`:

**Tabel `wa_customers`**
- `id` uuid PK
- `client_id` uuid FK -> clients
- `phone_number` text (unique per client via unique constraint)
- `name` text nullable
- `created_at` timestamptz

**Tabel `wa_conversations`**
- `id` uuid PK
- `client_id` uuid FK -> clients
- `customer_id` uuid FK -> wa_customers
- `handled_by` text default 'AI' (values: 'AI', 'HUMAN')
- `status` text default 'active' (values: 'active', 'closed')
- `created_at` timestamptz
- `updated_at` timestamptz

**Tabel `wa_messages`**
- `id` uuid PK
- `conversation_id` uuid FK -> wa_conversations
- `sender` text (values: 'USER', 'AI', 'ADMIN')
- `content` text
- `created_at` timestamptz

**Perubahan tabel `documents`**
- Tambah kolom `role_tag` text nullable (values: 'admin', 'warehouse', 'owner')

Semua tabel baru mendapat:
- RLS policy PERMISSIVE untuk admin (is_admin())
- Realtime enabled untuk `wa_conversations` dan `wa_messages`

---

## Fase 2: Edge Function `wa-webhook`

Endpoint untuk menerima pesan masuk dari Evolution API. Struktur generic sehingga mudah diadaptasi ke Twilio atau provider lain.

**Alur:**
1. Terima POST dari Evolution API (verify token via header/query param)
2. Extract phone number + message body
3. Lookup client_id dari wa_sessions (based on instance/session yang terhubung)
4. Lookup/create wa_customers berdasarkan phone number + client_id
5. Lookup/create wa_conversations yang status 'active' untuk customer ini
6. Cek `handled_by`:
   - **'AI'**: Panggil RAG (reuse logic test-rag), simpan pesan USER + pesan AI ke wa_messages, kirim reply via Evolution API (dengan delay 2-4 detik + typing indicator sesuai SOP anti-ban)
   - **'HUMAN'**: Simpan pesan USER ke wa_messages saja (admin reply dari dashboard)
7. Jika AI return 'ESKALASI_HUMAN': update handled_by ke 'HUMAN', kirim pesan eskalasi ke user, simpan ke wa_messages

**Safety Guardrails (SOP Anti-Ban):**
- Delay 2-4 detik sebelum reply + typing indicator
- Hanya inbound (tidak broadcast)
- Batas harian per client (configurable, default 300)

**Secrets yang dibutuhkan:**
- `EVOLUTION_API_URL` - URL instance Evolution API
- `EVOLUTION_API_KEY` - API key Evolution API
- `WA_WEBHOOK_SECRET` - Secret untuk verifikasi webhook

---

## Fase 3: Edge Function `wa-send-message`

Fungsi terpisah untuk mengirim pesan WhatsApp via Evolution API. Dipakai oleh:
- wa-webhook (reply AI + pesan eskalasi)
- Admin dashboard (reply manual admin)

**Fitur:**
- Kirim typing indicator (composing) selama 2-4 detik random
- Kirim pesan teks
- Log pesan ke wa_messages

---

## Fase 4: Admin Inbox Dashboard (`/admin/inbox`)

Halaman baru dengan layout split-view:

**Sidebar kiri:**
- Daftar conversations, dikelompokkan: "Butuh Admin" (HUMAN) di atas, "Ditangani AI" di bawah
- Badge unread / highlight merah untuk HUMAN conversations
- Filter by client
- Realtime update via Supabase channel

**Panel kanan (Chat):**
- Header: nama customer + phone number + badge handled_by
- Chat history: bubble berbeda warna per sender (USER = abu, AI = biru, ADMIN = hijau)
- Input box untuk admin reply (hanya aktif jika handled_by = 'HUMAN')
- Tombol toggle: "Ambil Alih" (switch ke HUMAN) / "Serahkan ke AI" (switch ke AI)
- Realtime: subscribe ke wa_messages untuk conversation yang sedang dilihat

---

## Fase 5: Update Navigasi + Routing

- Tambah menu "Inbox" di AdminSidebar (icon: MessageSquare)
- Tambah route `/admin/inbox` di App.tsx
- Update DeviceManager: tambah info bahwa Evolution API instance perlu dihubungkan

---

## Fase 6: Update Knowledge Base UI

- Tambah dropdown `role_tag` saat upload dokumen (opsional, default null = semua role)
- Tampilkan role_tag di tabel dokumen

---

## Detail Teknis

### File baru:
- `supabase/functions/wa-webhook/index.ts` - Webhook receiver
- `supabase/functions/wa-send-message/index.ts` - WhatsApp message sender
- `src/pages/admin/Inbox.tsx` - Admin live chat page
- `src/components/admin/InboxSidebar.tsx` - Conversation list sidebar
- `src/components/admin/InboxChat.tsx` - Chat panel

### File yang dimodifikasi:
- `src/App.tsx` - Tambah route /admin/inbox
- `src/components/admin/AdminSidebar.tsx` - Tambah menu Inbox
- `src/pages/admin/KnowledgeBase.tsx` - Tambah role_tag selector
- `supabase/config.toml` - Register fungsi baru
- 1 migration file untuk schema baru

### Urutan implementasi:
1. Migration (schema + RLS + realtime)
2. wa-send-message edge function
3. wa-webhook edge function
4. Admin Inbox UI (sidebar + chat)
5. Routing + navigasi
6. Knowledge Base role_tag update

### Catatan penting:
- **Evolution API** harus di-deploy sendiri di VPS (Docker). URL-nya disimpan sebagai secret.
- **Webhook URL** dari Edge Function akan di-set di Evolution API dashboard sebagai callback.
- System prompt RAG diupdate: jika AI tidak bisa jawab, reply "ESKALASI_HUMAN" (bukan fallback message).
- Batas harian 300 percakapan bisa di-adjust per client di tabel clients (tambah kolom `daily_message_limit`).

