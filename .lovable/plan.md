
Diagnosa cepat (berdasarkan investigasi):
- Kode saat ini sudah tidak punya CSP meta di `index.html`.
- Dari runtime uji saya, halaman `/` sebenarnya bisa render normal.
- Gejala kamu (“halaman putih kosong” + tidak ada network/console) paling konsisten dengan masalah bootstrap render di preview session tertentu, dan `framebusting` di `src/main.tsx` adalah titik paling sensitif untuk kasus iframe preview.

Rencana perbaikan (tanpa ubah arsitektur backend):

1) Kerasikan startup render agar tidak bisa “diam putih”
- File: `src/main.tsx`
- Ubah bootstrap jadi `try/catch`:
  - kalau render gagal, tampilkan fallback HTML error yang jelas (bukan blank putih)
  - log error startup ke console agar mudah didiagnosa di preview

2) Revisi logika anti-iframe agar aman untuk environment preview
- File: `src/main.tsx`
- Ganti check `window.top !== window.self` yang sekarang dengan kebijakan berbasis host + mode:
  - Preview/dev host: selalu izinkan render
  - Production host: tetap boleh pakai anti-framing
- Tujuan: keamanan production tetap ada, tapi preview tidak pernah terblokir diam-diam.

3) Tambahkan ErrorBoundary global di akar aplikasi
- File: `src/App.tsx` (atau `src/main.tsx`)
- Bungkus seluruh app dengan `ErrorBoundary` (komponen sudah ada di `src/components/ErrorBoundary.tsx`)
- Efek: jika ada error runtime di landing route sekalipun, user lihat pesan error + tombol reload, bukan layar putih.

4) Tambahkan indikator “boot success” ringan untuk debugging cepat
- File: `src/main.tsx`
- Setelah `createRoot(...).render(...)`, set marker sederhana (mis. `window.__APP_BOOTED__ = true`)
- Dipakai untuk membedakan: app tidak boot vs app boot tapi gagal di komponen.

5) Validasi setelah implementasi
- Buka `/` di preview dan pastikan konten hero muncul.
- Buka `/login` dan pastikan halaman tampil (minimal UI render, tanpa blank).
- Cek console preview: tidak ada error fatal saat bootstrap.
- Pastikan tidak ada regresi keamanan di production (anti-framing masih aktif untuk host production).

Technical details (ringkas):
- Akar risiko ada di startup path (`main.tsx`) karena satu exception sebelum React mount akan menghasilkan blank page tanpa boundary.
- `ErrorBoundary` hanya menangkap error di tree React, bukan error sebelum mount; karena itu perlu kombinasi `try/catch bootstrap + ErrorBoundary global`.
- Pendekatan ini memperbaiki observability (kelihatan errornya) dan stabilitas preview tanpa melepas kontrol keamanan production.
