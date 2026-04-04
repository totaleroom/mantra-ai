

# Plan: Zero-Hardcode Architecture — Dynamic Config Engine

## Masalah Inti

Edge functions (`wa-webhook`, `wa-send-message`, `manage-wa-instance`) membaca config dari **Deno env secrets** (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`), tapi Settings UI menyimpan ke tabel **`platform_settings`**. Akibatnya, mengubah URL/key di dashboard **tidak berpengaruh** — edge functions tetap pakai nilai lama dari secrets.

```text
SEKARANG (broken):
  Settings UI → platform_settings (DB)     ← dashboard baca dari sini
  Edge Functions → Deno.env.get("SECRET")  ← runtime baca dari sini (berbeda!)

TARGET:
  Settings UI → platform_settings (DB) ← SATU sumber kebenaran
  Edge Functions → baca dari platform_settings dulu, fallback ke env
  Dashboard → baca dari platform_settings
```

## Perubahan

### 1. Helper Function: `getConfig()` untuk Edge Functions

Buat helper yang di-copy ke setiap edge function yang butuh config. Logic:
1. Query `platform_settings` untuk key yang dibutuhkan
2. Jika ada di DB, pakai nilai DB
3. Jika tidak ada, fallback ke `Deno.env.get()`

```typescript
async function getConfig(supabase: any): Promise<Record<string, string>> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const config: Record<string, string> = {};
  for (const row of data || []) config[row.key] = row.value;
  return {
    evolution_api_url: config.evolution_api_url || Deno.env.get("EVOLUTION_API_URL") || "",
    evolution_api_key: config.evolution_api_key || Deno.env.get("EVOLUTION_API_KEY") || "",
    wa_webhook_secret: config.wa_webhook_secret || Deno.env.get("WA_WEBHOOK_SECRET") || "",
    // ... semua config lain
  };
}
```

### 2. Update Edge Functions (3 file)

| File | Perubahan |
|------|-----------|
| `supabase/functions/wa-webhook/index.ts` | Ganti semua `Deno.env.get("EVOLUTION_API_URL/KEY")` dengan `getConfig()` result. Config di-fetch 1x per request, di-pass ke helper functions. |
| `supabase/functions/wa-send-message/index.ts` | Sama — baca URL/key dari DB via `getConfig()` |
| `supabase/functions/manage-wa-instance/index.ts` | Sama — baca URL/key dari DB via `getConfig()` |

### 3. Enhanced Settings UI — Tab "WhatsApp API"

Tambahkan di `src/pages/admin/Settings.tsx`:

- **Live Diagnostics panel** setelah "Test Connection":
  - Tampilkan latency (ms), HTTP status, CORS status
  - Raw error response (sanitized) untuk debugging
  - Auto-retry indicator jika request pertama gagal

- **Connection status badge** yang real-time:
  - Hijau: connected + latency < 500ms
  - Kuning: connected tapi latency > 500ms
  - Merah: unreachable

- Update test handler untuk mengembalikan data diagnostik yang lebih kaya (latency, headers, error detail)

### 4. Update `manage-settings` Edge Function

Tambah action `test-evolution` response yang lebih kaya:
- `latency_ms`: waktu respons
- `cors_ok`: boolean (apakah bisa di-fetch dari edge function)
- `auth_valid`: boolean
- `error_detail`: pesan error spesifik

### 5. Settings Save → Invalidate Semua Query

Di frontend, setelah save settings berhasil, invalidate semua React Query cache agar semua komponen (Dashboard, Device Manager, dll) langsung fetch ulang dengan config baru.

## File Terdampak

| File | Aksi |
|------|------|
| `supabase/functions/wa-webhook/index.ts` | Tambah `getConfig()`, ganti env reads |
| `supabase/functions/wa-send-message/index.ts` | Tambah `getConfig()`, ganti env reads |
| `supabase/functions/manage-wa-instance/index.ts` | Tambah `getConfig()`, ganti env reads |
| `supabase/functions/manage-settings/index.ts` | Perkaya response `test-evolution` |
| `src/pages/admin/Settings.tsx` | Tambah Live Diagnostics panel, invalidate all queries on save |

## Yang TIDAK Diubah
- Database schema (sudah punya `platform_settings`)
- Auth flow
- Landing page
- Secrets yang sudah ada (tetap jadi fallback)

## Catatan Arsitektur
- `platform_settings` sudah dilindungi RLS (admin only)
- Edge functions pakai service role key untuk query `platform_settings`, jadi aman
- Fallback ke env secrets memastikan backward compatibility — jika DB kosong, sistem tetap jalan

