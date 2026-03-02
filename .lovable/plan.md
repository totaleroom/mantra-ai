
# Rencana Perbaikan: “Masih belum bisa masuk” (Login gagal masuk dashboard)

## Apa yang sudah saya verifikasi dari sistem saat ini

Saya sudah cek langsung data backend dan kode terbaru:

1. Login email/password **berhasil di backend** (status 200, event `Login` tercatat).
2. User `totale.room@gmail.com` **ada** dan role `admin` **ada** di tabel role.
3. Function `is_admin()` dan `has_role()` ada dan valid.
4. Perubahan terakhir di `Login.tsx` (hapus navigate manual + `useEffect` redirect) sudah masuk.

Artinya, masalah sekarang sangat mungkin berada di **sinkronisasi state frontend saat transisi login**, bukan kredensial.

---

## Diagnosis paling mungkin (kombinasi 2 titik lemah)

### 1) Timing state auth belum cukup “ketat”
Di `AuthContext`, saat event login datang:
- `user` di-set dulu,
- cek admin async jalan,
- tapi `loading` tidak dinaikkan dulu selama cek role berjalan.

Dampak:
- komponen route guard bisa membaca state peralihan yang belum stabil,
- user terasa “tidak masuk-masuk” atau balik ke login.

### 2) Honeypot bisa memblok submit secara diam-diam
Di `Login.tsx` sekarang ada:
```ts
if (honeypot) return;
```
tanpa pesan error.

Dampak:
- jika browser/password manager mengisi field tersembunyi, submit berhenti diam-diam dan user merasa tombol login tidak bekerja.

---

## Rencana implementasi (langsung fokus ke akar masalah)

## Tahap 1 — Stabilkan state autentikasi (prioritas tertinggi)

### File: `src/contexts/AuthContext.tsx`
Perubahan yang akan dilakukan:

1. **Gunakan state fase auth yang eksplisit**  
   Tambah fase internal seperti:
   - `initializing`
   - `authenticating`
   - `checking_admin`
   - `ready`

2. **Set `loading=true` saat mulai proses event login**
   Begitu `onAuthStateChange` menerima `SIGNED_IN`/session user:
   - set `loading=true` dulu,
   - baru cek `is_admin`,
   - setelah selesai baru `loading=false`.

3. **Tangani error RPC admin dengan eksplisit**
   Jika `is_admin` error:
   - simpan error state,
   - jangan silent fail,
   - tetap tutup loading dengan kondisi terdefinisi.

4. **Hilangkan celah race antara `getSession` vs `onAuthStateChange`**
   Tambahkan guard sinkronisasi agar hanya satu alur yang “menang” saat bootstrap session.

Hasil yang ditargetkan:
- transisi login deterministik,
- tidak ada state setengah jadi yang bikin guard salah baca.

---

## Tahap 2 — Perbaiki UX login agar tidak “silent fail”

### File: `src/pages/Login.tsx`
Perubahan yang akan dilakukan:

1. **Honeypot jangan return diam-diam**
   Jika terisi:
   - tampilkan toast informatif (mis. “Form terdeteksi tidak valid, silakan isi ulang manual”),
   - reset honeypot.

2. **Gunakan `loading` dari auth context untuk tombol**
   Tombol `Masuk` disable/spinner selama proses role-check berlangsung, jadi user tahu proses masih berjalan.

3. **Pesan jelas jika user berhasil login tapi bukan admin**
   Jika ada session tapi `isAdmin=false` setelah loading selesai:
   - tampilkan toast “Akun tidak memiliki akses admin”.

Hasil yang ditargetkan:
- tidak ada kondisi klik tombol tapi seolah tidak terjadi apa-apa,
- user dapat feedback status yang jelas.

---

## Tahap 3 — Tambah observability supaya tim maintenance mudah tracing

### File: `src/contexts/AuthContext.tsx`, `src/pages/Login.tsx`
Perubahan yang akan dilakukan:

1. Tambah log terstruktur (dev-only) untuk langkah:
   - signIn start/success/fail
   - auth state event
   - admin check start/success/fail
   - redirect decision

2. Standarkan error message untuk auth agar mudah dicari di log backend + frontend.

Hasil yang ditargetkan:
- tim dev/maintenance bisa cepat tahu bottleneck saat issue terulang,
- tidak tergantung “tebak-tebakan”.

---

## Tahap 4 — Verifikasi end-to-end (wajib)

Setelah implementasi, saya akan verifikasi skenario berikut:

1. Login admin valid → masuk ke `/admin/clients` tanpa loop.
2. Login saat koneksi lambat → tetap masuk, hanya spinner lebih lama.
3. Honeypot terisi otomatis browser → muncul feedback, bukan diam.
4. Akun non-admin → tidak masuk dashboard + pesan akses ditolak.
5. Refresh di halaman admin → tetap authorized tanpa mental ke login.

---

## File yang akan terdampak

- `src/contexts/AuthContext.tsx` (utama)
- `src/pages/Login.tsx` (utama)
- `src/hooks/useAuth.ts` (opsional kecil jika perlu expose status/error tambahan)

---

## Dampak bisnis & operasional

- Memperbaiki pengalaman “login tidak masuk-masuk”.
- Mengurangi laporan false error dari user.
- Membuat sistem lebih siap diserahkan ke tim human maintenance karena alur auth dan debug lebih terstruktur.

---

## Catatan untuk tim Anda (kemandirian platform)

Dengan perubahan ini, alur auth menjadi lebih “production-grade”:
- mudah dipelihara developer React biasa,
- diagnosis lebih cepat karena log/fase state jelas,
- tidak bergantung pada vibe coding untuk troubleshooting harian.

Jika Anda approve, langkah berikutnya saya implementasikan perubahan di atas dan langsung validasi alur login end-to-end.
