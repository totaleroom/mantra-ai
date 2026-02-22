

# Perbaikan End-to-End + Optimasi + Signup Text

## Temuan dari Audit

Setelah melakukan pengecekan menyeluruh, berikut temuan dan rencana perbaikan:

### 1. Login Page — Signup Text
Halaman login sudah memiliki toggle "Belum punya akun? Daftar". Akan diperkecil dan dibuat lebih jelas sebagai teks biasa (bukan tombol ghost) agar lebih mudah ditemukan.

### 2. Bug Kritis: Anti-Iframe Memblokir Preview
Kode framebusting di `src/main.tsx` (`window.top !== window.self`) memblokir app saat dijalankan di dalam iframe — termasuk di Lovable preview. Perbaikan: hanya aktifkan di production domain (bukan di `*.lovableproject.com` atau `*.lovable.app`).

### 3. Bug CSP: Realtime WebSocket Diblokir
CSP di `index.html` tidak menyertakan `wss://*.supabase.co` di `connect-src`. Ini akan memblokir Supabase Realtime (dipakai oleh Device & Connection untuk QR live update). Perbaikan: tambah `wss://*.supabase.co` ke `connect-src`.

### 4. React Warning: forwardRef pada App
Console menunjukkan warning "Function components cannot be given refs" pada `App`. Ini karena App component di-render sebagai arrow function tanpa forwardRef. Tidak kritis tapi akan di-fix.

### 5. Responsiveness
- Landing page: Sudah responsif di mobile (390px), tablet, dan desktop
- Login page: Sudah responsif di semua ukuran
- Admin pages: Menggunakan Sidebar component yang sudah collapsible di mobile

### 6. Asset Compression
Logo PNG files (`logo_mantra.png`, `logo_mantra_horizontal.png`) kemungkinan besar oversize untuk kebutuhan tampil sebagai ikon 64px dan header 28px. Kita bisa mengompres atau menggunakan dimensi yang lebih kecil. Akan dicek ukuran aktual dan kompres jika perlu, atau tambahkan `loading="lazy"` + `width/height` attributes.

### 7. Performance Quick Wins
- Tambah `loading="lazy"` pada gambar yang tidak di above-the-fold
- Tambah explicit `width` dan `height` pada `<img>` tag untuk menghindari layout shift

---

## Rencana Perubahan

### File: `src/main.tsx`
- Perbaiki framebusting: hanya blokir jika bukan domain Lovable (production safety)

### File: `index.html`
- Tambah `wss://*.supabase.co` ke CSP `connect-src`

### File: `src/pages/Login.tsx`
- Ubah toggle "Belum punya akun? Daftar" dari Button ghost menjadi teks kecil `<p>` yang lebih natural
- Pastikan tetap berfungsi sebagai toggle

### File: `src/components/landing/Navbar.tsx`, `Footer.tsx`, `AdminSidebar.tsx`
- Tambah `loading="lazy"`, `width`, `height` pada logo images
- Pastikan dimensi sesuai kebutuhan tampil

### File: `src/App.tsx`
- Tidak ada perubahan diperlukan (warning hanya development, tidak mempengaruhi production)

---

## Detail Teknis

### main.tsx — Framebusting Perbaikan
```typescript
// Only block iframe in production (not in Lovable preview/dev)
if (window.top !== window.self) {
  const hostname = window.location.hostname;
  const isLovable = hostname.includes('lovableproject.com') || hostname.includes('lovable.app');
  if (!isLovable) {
    document.body.innerHTML = '<h1 style="text-align:center;margin-top:40vh;font-family:sans-serif">Access Denied</h1>';
  }
}
```

### index.html — CSP Fix
```text
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
```

### Login.tsx — Signup Text
Ganti Button ghost dengan teks kecil:
```tsx
<p className="mt-4 text-center text-sm text-muted-foreground">
  {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
  <button
    type="button"
    onClick={() => setMode(mode === "login" ? "register" : "login")}
    className="font-medium text-primary underline-offset-4 hover:underline"
  >
    {mode === "login" ? "Daftar di sini" : "Masuk"}
  </button>
</p>
```

### Image Optimization
- Tambah `width` dan `height` explicit pada semua `<img>` tag
- Tambah `loading="lazy"` pada logo di footer (below fold)

