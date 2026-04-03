

# Fix: Buat Custom API Key untuk AstrBot Akses Snapshot

## Masalah
`SUPABASE_SERVICE_ROLE_KEY` adalah secret internal sistem — tidak bisa dilihat atau di-copy dari UI Lovable Cloud. User tidak bisa menggunakannya untuk konfigurasi AstrBot.

## Solusi
Tambahkan mekanisme custom API key di edge function `system-snapshot`:

### Langkah 1: User buat secret baru
Di halaman Secrets (yang sedang dibuka), tambahkan:
- **Name**: `SNAPSHOT_API_KEY`
- **Value**: password/key bebas yang user tentukan sendiri (misalnya: `mantra-bot-2026-secret`)

### Langkah 2: Update edge function `system-snapshot`
File: `supabase/functions/system-snapshot/index.ts`

Ubah logika auth `X-Api-Key` dari membandingkan dengan `SUPABASE_SERVICE_ROLE_KEY` menjadi membandingkan dengan `SNAPSHOT_API_KEY`:

```typescript
// Sebelum:
if (apiKey !== serviceRoleKey) { ... }

// Sesudah:
const snapshotApiKey = Deno.env.get("SNAPSHOT_API_KEY");
if (!snapshotApiKey || apiKey !== snapshotApiKey) { ... }
```

Tetap mempertahankan opsi JWT auth sebagai fallback.

### Langkah 3: Konfigurasi di AstrBot
User tinggal set di AstrBot tool/plugin:
```
GET https://jvyklrivwjubuwjdmvfq.supabase.co/functions/v1/system-snapshot
Header: X-Api-Key: <nilai SNAPSHOT_API_KEY yang user buat>
```

## File Terdampak

| File | Perubahan |
|------|-----------|
| `supabase/functions/system-snapshot/index.ts` | Ganti referensi service role key ke `SNAPSHOT_API_KEY` |

## Yang User Lakukan
1. Buka Secrets → klik "+ Add another"
2. Name: `SNAPSHOT_API_KEY`, Value: key bebas pilihan sendiri → Save
3. Approve plan ini agar saya update edge function
4. Copy key yang sama ke konfigurasi AstrBot

