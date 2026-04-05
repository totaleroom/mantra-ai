

# Plan: Multi-Platform WhatsApp Dashboard — Platform-Agnostic Architecture

## Ringkasan

Saat ini dashboard hardcoded ke "Evolution API" — label, logic, diagnostics, dan device manager semuanya hanya mengenal satu provider. Plan ini akan membuat seluruh dashboard **platform-agnostic**, sehingga bisa bekerja dengan Evolution API, wa-bridge-lite, Baileys, atau provider WA lain yang akan datang.

## Perubahan Database

### Migration: Tambah kolom `provider` di `wa_sessions`
```sql
ALTER TABLE public.wa_sessions 
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution';
COMMENT ON COLUMN public.wa_sessions.provider IS 'WA provider: evolution, wwebjs, baileys, n8n, custom';
```

## Perubahan File

### 1. `src/hooks/useAdminData.ts` — Dynamic System Health

**`useSystemHealth()`**: Ganti logic yang hanya cek `evolution_api_url` menjadi:
- Baca `wa_provider` dari `platform_settings` untuk tahu provider aktif
- Baca URL sesuai provider (`evolution_api_url` atau `wwebjs_api_url`)
- Return `{ provider, providerUrl, providerConfigured }` alih-alih `evolutionConfigured`
- Tambah breakdown sessions per provider: `sessionsByProvider: { evolution: {total, connected}, wwebjs: {total, connected} }`

### 2. `src/pages/admin/Dashboard.tsx` — Dynamic Control Tower

Perubahan di System Health section:
- **`EVO-API-GATEWAY`** → rename menjadi **`WA-GATEWAY`** yang menampilkan nama provider aktif secara dinamis (e.g. "EVOLUTION", "WWEBJS", "N8N")
- Tambah label provider di bawah `WA-SESSIONS` bar: e.g. "2 Evolution, 1 WA Bridge Lite"
- `criticalResources` message: ganti "Evolution API belum dikonfigurasi" → "WhatsApp provider belum dikonfigurasi"
- Version string di footer: update ke "V3.0.0 / MULTI-PLATFORM"

### 3. `src/pages/admin/Settings.tsx` — Super Customizable Settings

**Tab "WhatsApp API" → rename "WhatsApp Provider"**:

Tambah di atas form:
- **Provider Selector** (dropdown): `Evolution API` | `WA Bridge Lite (WWeb.js)` | `Custom/n8n` 
- Masing-masing provider menampilkan form fields yang berbeda:
  - **Evolution**: API URL, API Key, Webhook Secret (existing)
  - **WA Bridge Lite**: API URL, API Token
  - **Custom/n8n**: Webhook URL (dimana n8n mengirim), Send Message URL, Auth Header
- Provider active disimpan ke `platform_settings` key `wa_provider`
- Diagnostics panel adapts per provider:
  - Evolution: test `/instance/fetchInstances`
  - WA Bridge Lite: test `/status?token=...`
  - Custom: test ping ke URL yang dikonfigurasi

**Tab baru "Endpoints & Integration"**:
- Tampilkan semua endpoint URL (webhook, snapshot) dengan tombol copy
- Instruksi setup per provider
- n8n webhook payload template

### 4. `src/pages/admin/DeviceManager.tsx` — Multi-Provider Device Manager

- Tambah **provider badge** di setiap instance card (Evolution / WA Bridge / Custom)
- **Create dialog**: tambah dropdown pilih provider per instance
- **Action routing**: `invokeManage` kirim `provider` dalam body, edge function route action ke API yang sesuai
- **Diagnostics panel**: ganti "Evolution API Aktif" → tampilkan status per provider yang dikonfigurasi
- Label "Sync dari VPS" → "Sync dari Provider" (generic)

### 5. `src/components/admin/InstanceCard.tsx` — Provider Badge

- Tambah prop `provider` dari session data
- Tampilkan badge kecil di header: `[EVO]`, `[WWEBJS]`, `[N8N]`
- QR section: untuk wwebjs, tampilkan link langsung ke `/qr?session=...` sebagai alternatif

### 6. `supabase/functions/manage-wa-instance/index.ts` — Multi-Provider Routing

Tambah provider routing di setiap action:
```
function getProviderApi(config, provider) {
  if (provider === 'wwebjs') return { url: config.wwebjs_api_url, key: config.wwebjs_api_key, type: 'wwebjs' };
  if (provider === 'custom') return { url: config.custom_wa_url, key: config.custom_wa_key, type: 'custom' };
  return { url: config.evolution_api_url, key: config.evolution_api_key, type: 'evolution' };
}
```
- **create**: Route ke Evolution `instance/create` atau wa-bridge-lite `POST /session/start`
- **connect (QR)**: Route ke Evolution `instance/connect` atau wa-bridge-lite `GET /qr?session=...`
- **status**: Route ke provider-specific status endpoint
- **restart/logout/delete**: Route accordingly
- **diagnostics/test-all**: Test semua provider yang dikonfigurasi

### 7. `supabase/functions/wa-webhook/index.ts` — Event Normalization

Tambah layer normalisasi di awal handler:
```
function normalizeIncomingEvent(body, headers) {
  // Detect provider dari header atau body structure
  if (body.event === 'messages.upsert') return { provider: 'evolution', ... };
  if (body.type === 'message' && body.session) return { provider: 'wwebjs', ... };
  if (body.source === 'n8n') return { provider: 'n8n', ... };
}
```
- Normalize message fields: `from`, `body`, `mediaUrl` ke format internal
- Normalize connection events: `qr`, `connected`, `disconnected`
- Lookup provider dari `wa_sessions.provider` untuk outgoing routing

### 8. `supabase/functions/wa-send-message/index.ts` — Multi-Provider Send

```
if (provider === 'wwebjs') {
  await fetch(`${url}/send?session=${instance}&token=${key}`, { body: { to, text } });
} else if (provider === 'evolution') {
  await fetch(`${url}/message/sendText/${instance}`, { headers: { apikey: key }, body: { number, text } });
} else if (provider === 'custom') {
  await fetch(customSendUrl, { headers: { Authorization: authHeader }, body: { to, message } });
}
```

### 9. `supabase/functions/manage-settings/index.ts` — Provider-Aware Test

Update `test-evolution` action → `test-provider`:
- Accept `provider` param
- Route test ke endpoint yang sesuai
- Return unified diagnostics format

## Secrets yang Perlu Ditambahkan

User perlu menambahkan via Lovable Cloud Secrets (hanya jika menggunakan provider tersebut):
- `WWEBJS_API_URL` — URL wa-bridge-lite
- `WWEBJS_API_KEY` — Token wa-bridge-lite

## Prioritas Implementasi

1. Database migration (tambah `provider` column)
2. Settings UI (provider selector + dynamic form)
3. Dashboard Control Tower (dynamic labels)
4. Device Manager + InstanceCard (provider routing + badges)
5. Edge functions (multi-provider routing)
6. Webhook normalization layer

## Yang TIDAK Diubah
- Auth flow, RLS policies
- Landing page
- Knowledge Base, Inbox, Monitoring pages
- Tabel database lain (clients, documents, wa_messages, dll)

