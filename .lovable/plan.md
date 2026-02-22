

# Halaman Settings untuk Admin Dashboard

## Masalah

Saat ini ada banyak setting dan data yang hanya bisa diakses melalui database langsung, padahal seharusnya bisa dikelola dari dashboard:

| Setting | Lokasi Sekarang | Ada UI? |
|---------|----------------|---------|
| Quota limit per client | Tabel `clients.quota_limit` | Tidak -- hanya tampil, tidak bisa edit |
| Quota remaining (reset/top-up) | Tabel `clients.quota_remaining` | Tidak |
| Daily message limit | Tabel `clients.daily_message_limit` | Tidak |
| Client status (active/inactive) | Tabel `clients.status` | Tidak |
| User/Admin management | Tabel `user_roles` + auth.users | Tidak ada sama sekali |
| Evolution API config | Secrets (env vars) | Tidak -- harus lewat Cloud |
| AI System prompt template | Hardcoded di wa-webhook | Tidak |
| WA Session management | Tabel `wa_sessions` | Ada (DeviceManager) |

## Solusi

### 1. Perluas Form Edit Client (di `Clients.tsx`)

Tambahkan field yang hilang di dialog Add/Edit Client:
- **Quota Limit** (number input) -- batas kuota total
- **Quota Remaining** (number input) -- sisa kuota, bisa di-reset manual
- **Daily Message Limit** (number input, default 300) -- batas pesan harian
- **Status** (select: active/inactive) -- aktifkan/nonaktifkan client

Ini memungkinkan admin mengatur semua parameter client tanpa buka database.

### 2. Buat Halaman Settings (`/admin/settings`)

Halaman baru dengan tab-tab:

**Tab 1: Admin Users**
- Tabel daftar admin (dari `user_roles` + email dari auth)
- Tombol "Invite Admin" -- form email + password untuk signup admin baru
- Tombol hapus admin (kecuali diri sendiri)
- Menggunakan edge function baru `manage-admin` untuk create user + assign role secara aman (karena client-side tidak bisa akses `auth.admin`)

**Tab 2: WhatsApp / Evolution API**
- Form input: Evolution API URL, API Key, Webhook Secret
- Tombol "Test Connection" -- panggil edge function untuk verify koneksi
- Info webhook URL yang harus di-set di Evolution API dashboard
- Menggunakan edge function baru `manage-settings` untuk read/write settings secara aman (secrets tidak bisa diakses dari frontend, jadi kita buat tabel `platform_settings` untuk config yang non-secret, dan tetap pakai edge function untuk config secret)

**Tab 3: AI Configuration**
- System prompt template (textarea) -- bisa dikustomisasi per client atau global
- Model selection (dropdown: gemini-2.5-flash-lite, gemini-2.5-flash, dll)
- Temperature setting (slider 0-1)
- Max tokens (number input)
- Disimpan di tabel baru `platform_settings` (key-value store)

**Tab 4: Safety & Limits**
- Default daily message limit untuk client baru
- Default quota limit untuk client baru
- Anti-ban delay range (min/max detik)
- Escalation message template (textarea)

### 3. Tabel Database Baru: `platform_settings`

```
platform_settings:
  - id (uuid PK)
  - key (text, unique) -- e.g. "ai_model", "default_quota", "escalation_message"
  - value (text) -- JSON-encoded value
  - updated_at (timestamptz)
```

RLS: admin only. Ini untuk menyimpan config yang bisa diubah dari UI.

### 4. Edge Function Baru: `manage-admin`

Untuk mengelola admin users secara aman:
- POST: Create user baru via Supabase Admin API + assign role "admin"
- DELETE: Hapus role admin (tidak hapus user)
- GET: List semua admin (join user_roles dengan auth.users email)

Perlu `SUPABASE_SERVICE_ROLE_KEY` karena create user membutuhkan admin access.

### 5. Edge Function Baru: `manage-settings`

Untuk mengelola settings:
- GET: Baca semua platform_settings
- POST: Update/insert platform_settings
- POST `/test-evolution`: Test koneksi ke Evolution API

---

## Detail Teknis

### File baru:
- `src/pages/admin/Settings.tsx` -- Halaman settings dengan tabs
- `supabase/functions/manage-admin/index.ts` -- Edge function admin user management
- `supabase/functions/manage-settings/index.ts` -- Edge function settings management
- 1 migration file untuk tabel `platform_settings`

### File yang dimodifikasi:
- `src/pages/admin/Clients.tsx` -- Tambah field quota_limit, quota_remaining, daily_message_limit, status di form
- `src/components/admin/AdminSidebar.tsx` -- Tambah menu "Settings" (icon: Settings/Cog)
- `src/App.tsx` -- Tambah route `/admin/settings`
- `supabase/functions/wa-webhook/index.ts` -- Baca system prompt, model, temperature dari platform_settings (bukan hardcoded)

### Urutan implementasi:
1. Migration tabel `platform_settings`
2. Edge function `manage-admin` dan `manage-settings`
3. Update form Client (tambah field)
4. Buat halaman Settings dengan 4 tab
5. Update routing + sidebar
6. Update wa-webhook untuk baca config dari platform_settings

