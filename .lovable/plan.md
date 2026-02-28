

# Sync Instance WhatsApp dari VPS + Perbaikan Device Manager

## Masalah
- VPS sudah punya 2 instance (`Totale Bot`, `mantra-bot-1`) tapi tabel `wa_sessions` kosong
- Dashboard Device Manager tidak bisa menampilkan, mengontrol, atau menghapus instance yang ada
- Webhook belum terpasang di instance yang ada

## Solusi

### 1. Tambah action `sync` di edge function `manage-wa-instance`
Endpoint baru `POST ?action=sync` yang:
- Memanggil Evolution API `GET /instance/fetchInstances` untuk ambil semua instance
- Untuk setiap instance yang belum ada di `wa_sessions`, insert row baru dengan `client_id` yang dipilih
- Otomatis pasang webhook (`POST /webhook/set/{instance}`) ke setiap instance dengan URL, secret, dan events yang benar
- Return daftar instance yang berhasil di-sync

### 2. Tambah tombol "Sync dari VPS" di DeviceManager
- Tombol baru di samping dropdown client
- Saat diklik, panggil `manage-wa-instance?action=sync` dengan `client_id` yang dipilih
- Setelah sync selesai, instance muncul di dashboard dan bisa langsung dikontrol

### 3. Perbaikan minor DeviceManager
- Tampilkan semua instance milik client (bukan hanya 1 via `maybeSingle`)
- Support multiple instances per client (ubah dari single session ke array)
- Setiap instance punya tombol sendiri: Fetch QR, Restart, Logout, Hapus

## Alur setelah implementasi
1. Buka `/admin/devices`, pilih client `Totale.Room`
2. Klik "Sync dari VPS" -- kedua instance (`Totale Bot`, `mantra-bot-1`) akan muncul
3. Webhook otomatis terpasang di kedua instance
4. Klik "Fetch QR" di salah satu instance untuk scan dan connect
5. Setelah scan, status otomatis berubah ke "Connected" via webhook realtime

## Detail Teknis

### Edge function `manage-wa-instance` - action sync
```text
POST ?action=sync { client_id }
1. GET /instance/fetchInstances dari Evolution API
2. Untuk setiap instance:
   a. Cek apakah sudah ada di wa_sessions (by instance_name)
   b. Jika belum, INSERT ke wa_sessions
   c. POST /webhook/set/{instanceName} dengan config webhook
3. Return { synced: [...], existing: [...] }
```

### DeviceManager - Multiple instances
- Query `wa_sessions` dengan `.select("*").eq("client_id", ...)` (tanpa `maybeSingle`)
- Render setiap instance sebagai card terpisah dengan status, QR, dan action buttons
- Realtime subscription tetap berjalan untuk update otomatis

### File yang diubah
1. `supabase/functions/manage-wa-instance/index.ts` - tambah action `sync`
2. `src/pages/admin/DeviceManager.tsx` - tambah tombol sync + support multi-instance
