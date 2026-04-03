

# Plan: Integrasi wa-bridge-lite sebagai Provider WhatsApp

## Situasi Saat Ini
- Semua edge function (`wa-webhook`, `manage-wa-instance`, `wa-send-message`) hardcoded ke Evolution API
- VPS sekarang menjalankan wa-bridge-lite di `http://43.157.223.29:3020` dengan token auth
- wa-bridge-lite sudah dikonfigurasi mengirim webhook ke endpoint `wa-webhook` kita
- API wa-bridge-lite berbeda dari Evolution: `/qr`, `/status`, `/send`, `/sessions` dll, auth via `?token=`

## Arsitektur Baru

```text
Dashboard → manage-wa-instance → deteksi provider → Evolution API / wa-bridge-lite
wa-bridge-lite → wa-webhook → deteksi format → proses pesan → wa-send-message → kirim via provider yg sesuai
```

## Perubahan Database

**Migration**: Tambah kolom `provider` di `wa_sessions`
```sql
ALTER TABLE public.wa_sessions 
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'wwebjs';
```
Default `wwebjs` karena VPS sekarang pakai wa-bridge-lite.

## Perubahan Secrets

Tambah 2 secret baru:
- `WWEBJS_API_URL` = `http://43.157.223.29:3020`
- `WWEBJS_API_KEY` = `1d8c8e708909e486c01f204100e64777`

## Perubahan Edge Functions

### 1. `supabase/functions/wa-webhook/index.ts`
- **`normalizeEventName()`**: Tambah mapping untuk format event wa-bridge-lite (kemungkinan `message`, `session.status`, `qr` dll vs Evolution `MESSAGES_UPSERT`, `CONNECTION_UPDATE`, `QRCODE_UPDATED`)
- **`extractQrFromWebhook()`**: Tambah parsing format QR dari wa-bridge-lite
- **`mapConnectionState()`**: Tambah state `CONNECTED`/`DISCONNECTED` dari wa-bridge-lite
- **Message parsing (line 350+)**: Deteksi format pesan wa-bridge-lite vs Evolution (field names berbeda: `remoteJid` vs `from`, `message.conversation` vs `body`, dll)
- **`sendWhatsAppMessage()`**: Lookup provider dari `wa_sessions`, route ke Evolution atau wa-bridge-lite API
- **`downloadMediaBase64()`**: Tambah path untuk wa-bridge-lite media download

### 2. `supabase/functions/manage-wa-instance/index.ts`
- **Provider detection**: Baca `provider` dari `wa_sessions` atau default dari config
- **Create**: Untuk wwebjs, panggil `POST /sessions` (wa-bridge-lite) bukan Evolution `instance/create`
- **Connect (fetch QR)**: Untuk wwebjs, panggil `GET /qr?session={name}&token={key}`
- **Status**: Panggil `GET /status?session={name}&token={key}`
- **Restart/Logout/Delete**: Map ke endpoint wa-bridge-lite yang sesuai
- **Health-check/Diagnostics/Test-all**: Cek wa-bridge-lite reachability selain/alih Evolution
- **Sync**: List sessions dari wa-bridge-lite

### 3. `supabase/functions/wa-send-message/index.ts`
- Lookup provider dari `wa_sessions` berdasarkan `instance_name`
- Jika `wwebjs`: kirim via `POST http://.../send?session={name}&token={key}` dengan body `{ to, text }`
- Jika `evolution`: kirim via Evolution API (existing)

### 4. `supabase/functions/manage-settings/index.ts`
- Tambah field untuk wa-bridge-lite URL & token di Settings (selain Evolution API URL & key)

## Perubahan Frontend

### `src/pages/admin/Settings.tsx`
- Tambah field input di tab WhatsApp API:
  - Provider default (dropdown: Evolution / wa-bridge-lite)
  - wa-bridge-lite URL
  - wa-bridge-lite Token

### `src/pages/admin/DeviceManager.tsx`
- Saat create instance, pilih provider
- Tampilkan provider badge di InstanceCard
- QR untuk wwebjs: tampilkan link langsung ke `/qr?session=...&token=...` atau embed

### `src/components/admin/InstanceCard.tsx`
- Tampilkan badge provider (Evolution / WA Bridge Lite)

## Prioritas Implementasi
1. Migration + secrets (fondasi)
2. `wa-webhook` (terima event dari wa-bridge-lite)
3. `manage-wa-instance` (create/connect/QR via wa-bridge-lite)
4. `wa-send-message` (kirim pesan via wa-bridge-lite)
5. Frontend Settings & DeviceManager update

## Yang TIDAK Diubah
- Logika AI (RAG, prompts, escalation) tetap sama
- Tabel lain (clients, documents, wa_customers, wa_conversations, wa_messages)
- Landing page

