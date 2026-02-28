

# Perbaikan Device Manager: Delete, Status Constraint, dan UX

## Masalah yang Ditemukan

### 1. Database constraint terlalu ketat (penyebab utama error)
Tabel `wa_sessions` punya CHECK constraint yang hanya mengizinkan status `connected` dan `disconnected`. Tapi kode menggunakan status `connecting` saat create, sync, restart, dan fetch QR -- ini menyebabkan error "violates check constraint" dan semua operasi gagal.

### 2. Delete gagal karena crash di edge function
Saat operasi sebelumnya gagal (karena constraint), edge function crash dan return error 500. Tombol hapus juga tidak punya konfirmasi, jadi mudah salah klik.

### 3. UX kurang user-friendly
- Tidak ada konfirmasi sebelum menghapus instance
- Error message tidak jelas ("failed to fetch")
- Tidak bisa melihat daftar instance langsung dari VPS

## Solusi

### 1. Update database constraint
Tambah status `connecting` ke daftar status yang diizinkan:

```text
ALTER TABLE wa_sessions DROP CONSTRAINT wa_sessions_status_check;
ALTER TABLE wa_sessions ADD CONSTRAINT wa_sessions_status_check 
  CHECK (status IN ('connected', 'disconnected', 'connecting'));
```

### 2. Tambah action "list" di edge function
Endpoint baru `POST ?action=list` yang langsung ambil semua instance dari Evolution API tanpa perlu ada di database. Berguna untuk melihat apa saja yang ada di VPS.

### 3. Perbaikan UX di DeviceManager
- Tambah dialog konfirmasi sebelum hapus instance (AlertDialog)
- Tambah tombol "Lihat Instance VPS" untuk melihat langsung daftar dari Evolution API
- Error handling yang lebih jelas dengan pesan spesifik
- Tambah action "Hapus Semua" untuk reset dari awal

### 4. Perbaikan InstanceCard
- Tambah konfirmasi dialog di tombol Hapus (mencegah salah klik)

## Detail Teknis

### File yang diubah
1. **Database migration** -- update CHECK constraint untuk izinkan `connecting`
2. **`supabase/functions/manage-wa-instance/index.ts`** -- tambah action `list` dan `delete-all`
3. **`src/pages/admin/DeviceManager.tsx`** -- tambah tombol "Lihat Instance VPS", dialog konfirmasi hapus, error handling lebih baik
4. **`src/components/admin/InstanceCard.tsx`** -- tambah AlertDialog konfirmasi di tombol Hapus

### Alur setelah fix
1. Buka Device Manager, pilih client
2. Klik "Sync dari VPS" -- instance muncul (status `connecting` atau `disconnected` tidak error lagi)
3. Klik "Hapus" di instance -- muncul konfirmasi dulu, baru dihapus
4. Bisa mulai dari awal: hapus semua instance lama, buat baru, scan QR
