

# PageSpeed Insights Report & Security Fixes

## PageSpeed Scores (Mobile)

| Metric | Score |
|--------|-------|
| Performa | 76/100 |
| Aksesibilitas | 85/100 |
| Praktik Terbaik | 92/100 |
| SEO | 100/100 |

### Performance Metrics

| Metric | Nilai | Status |
|--------|-------|--------|
| First Contentful Paint | 1.8 dtk | Kuning |
| Largest Contentful Paint | 4.1 dtk | Merah |
| Total Blocking Time | 70 md | Hijau |
| Cumulative Layout Shift | 0 | Hijau |
| Speed Index | 9.8 dtk | Merah |

---

## Masalah yang Ditemukan & Rencana Perbaikan

### 1. Performance: Font Loading Blocking Render (LCP 4.1 dtk)

Google Fonts di-import via CSS `@import` yang memblokir render selama 750 md. Font juga menjadi bagian dari critical request chain (8.7 dtk total).

**Fix:**
- Pindahkan Google Fonts dari `@import` di `src/index.css` ke `<link>` di `index.html` dengan `rel="preconnect"` dan `display=swap`
- Tambahkan `<link rel="preconnect">` ke `fonts.googleapis.com` dan `fonts.gstatic.com`

**File:** `index.html`, `src/index.css`

### 2. Performance: Logo Oversized (23 KiB bisa hemat 22.5 KiB)

Logo `logo_mantra_horizontal.png` berukuran asli 1920x366 tapi ditampilkan 210x40. Terlalu besar.

**Fix:**
- Tambahkan atribut `width` dan `height` yang sesuai (sudah ada)
- Tidak bisa resize file PNG dari sini, tapi bisa tambahkan `fetchpriority="high"` pada logo di Navbar karena itu di viewport awal
- Tambahkan `loading="lazy"` pada logo di Footer (sudah ada)

### 3. Performance: CSP font-src Blocking cdn.gpteng.co

Console error: font dari `cdn.gpteng.co` diblokir oleh CSP. Ini dari platform Lovable, bukan dari kode kita. Tidak bisa di-fix dari sisi kita karena CSP di meta tag.

**Fix:** Tambahkan `https://cdn.gpteng.co` ke `font-src` di CSP meta tag agar tidak error di console.

### 4. Performance: CSP via meta tag warnings

`frame-ancestors` dan `X-Frame-Options` tidak bisa diset via `<meta>` tag. Hanya efektif via HTTP header.

**Fix:** Hapus `frame-ancestors` dari CSP meta tag dan hapus `X-Frame-Options` meta tag karena keduanya tidak berfungsi dari meta. Ini menghilangkan 2 console errors.

### 5. Aksesibilitas: Tombol tanpa nama (skor 85)

- Mobile menu toggle button tidak punya `aria-label`
- Pricing toggle button tidak punya `aria-label`
- Slider di ROI Calculator dan Admin Cost Calculator tidak punya `aria-label`

**Fix:**
- Tambahkan `aria-label="Buka menu navigasi"` ke mobile toggle di `Navbar.tsx`
- Tambahkan `aria-label="Toggle harga tahunan"` ke pricing toggle di `Pricing.tsx`
- Tambahkan `aria-label` ke Slider di `ROICalculator.tsx` dan `AdminCostCalculator.tsx`

### 6. Aksesibilitas: Kontras warna rendah

Banyak elemen gagal kontras, terutama:
- `text-primary` (orange) di background terang -- kurang kontras
- `text-muted-foreground` di background terang
- `text-primary-foreground` di `bg-primary`

**Fix:**
- Gelapkan `--primary` sedikit agar kontras lebih baik: dari `24 95% 53%` ke `24 95% 45%`
- Gelapkan `--muted-foreground` dari `220 9% 46%` ke `220 9% 40%`

### 7. Aksesibilitas: Heading order tidak berurutan

Footer menggunakan `<h4>` tanpa `<h3>` sebelumnya, melanggar heading hierarchy.

**Fix:** Ganti `<h4>` di Footer menjadi `<p>` atau `<h3>` yang proper.

### 8. Aksesibilitas: Tidak ada `<main>` landmark

Halaman tidak punya `<main>` element.

**Fix:** Wrap konten di `Index.tsx` dengan `<main>`.

### 9. Security Findings (4 items dari scan)

Scanner masih melaporkan 4 tabel "publicly readable" karena policy menggunakan `RESTRICTIVE` tanpa `PERMISSIVE`. Secara teknis ini false positive karena tanpa PERMISSIVE policy, default deny berlaku -- artinya `anon` tetap tidak bisa baca data.

**Fix:** Mark semua 4 findings sebagai ignored dengan penjelasan teknis bahwa RESTRICTIVE-only policies default to deny untuk anon users.

### 10. Security: Leaked Password Protection (warning)

**Status:** Non-blocker warning. Tetap di-note tapi tidak perlu action karena ini setting di level platform.

---

## Ringkasan Perubahan File

| File | Perubahan |
|------|-----------|
| `index.html` | Tambah `preconnect` fonts, perbaiki CSP (tambah `cdn.gpteng.co` di font-src, hapus `frame-ancestors`), hapus `X-Frame-Options` meta |
| `src/index.css` | Hapus `@import` Google Fonts (pindah ke HTML) |
| `src/pages/Index.tsx` | Wrap content dengan `<main>` |
| `src/components/landing/Navbar.tsx` | Tambah `aria-label` ke mobile toggle |
| `src/components/landing/Pricing.tsx` | Tambah `aria-label` ke toggle button |
| `src/components/landing/ROICalculator.tsx` | Tambah `aria-label` ke Slider |
| `src/components/landing/AdminCostCalculator.tsx` | Tambah `aria-label` ke Slider |
| `src/components/landing/Footer.tsx` | Ubah `<h4>` ke `<p>` dengan styling yang sama |
| CSS variables | Gelapkan `--primary` dan `--muted-foreground` untuk kontras lebih baik |
| Security findings | Mark 4 false-positive RLS findings sebagai ignored |

---

## Estimasi Dampak

| Metric | Sebelum | Target |
|--------|---------|--------|
| Performance | 76 | 82-88 (font fix + CSP cleanup) |
| Aksesibilitas | 85 | 95+ (aria-labels + kontras + landmarks) |
| Praktik Terbaik | 92 | 95+ (console errors fixed) |
| SEO | 100 | 100 (tetap) |

