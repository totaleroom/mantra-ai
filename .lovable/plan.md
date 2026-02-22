

# Production-Ready: Admin Access, Footer, SEO, Documentation, VPS Prep

## 1. Grant Admin Access to totale.room@gmail.com

Insert admin role ke tabel `user_roles` untuk user ID `00cfa2ef-a8d6-4922-9b71-673380885ca4` (totale.room@gmail.com) agar bisa mengakses dashboard admin.

---

## 2. Fix Logo Stretch

Semua `<img>` logo akan ditambahkan class `object-contain` agar rasio gambar tetap stabil dan tidak stretch di berbagai ukuran layar.

**File yang diubah:** `Navbar.tsx`, `Footer.tsx`, `AdminSidebar.tsx`, `Login.tsx`

---

## 3. Footer Overhaul

Footer akan di-redesign menjadi lebih lengkap:

- **Kontak:** Email hello00mantra@gmail.com, Instagram @hiimantra
- **Privacy Policy:** Dialog pop-up menggunakan Radix Dialog, berisi kebijakan privasi dasar dalam Bahasa Indonesia
- **Keyword Index (Ghost Text):** Teks SEO tak terlihat oleh pengguna (warna `text-transparent` + sr-only pattern) berisi keyword relevan: "chatbot UMKM Indonesia", "otomasi WhatsApp bisnis", "asisten AI UMKM", "customer service otomatis", dll.
- **Navigasi footer:** Masalah, Solusi, Harga, FAQ tetap ada

---

## 4. SEO & Meta Tags Lengkap

### File: `index.html`
- Tambah `<html lang="id">` (ganti dari "en" ke "id" karena target Indonesia)
- Tambah canonical URL
- Tambah `geo.region`, `geo.placename` meta tags untuk Indonesia
- Tambah meta untuk Bing Webmaster verification (placeholder `BING_VERIFICATION_CODE`)
- Tambah Google Search Console verification (placeholder `GOOGLE_VERIFICATION_CODE`)
- Tambah `og:url`, `og:locale` meta tags
- Tambah structured data JSON-LD (Organization + WebSite schema) untuk AI search engine discoverability (Perplexity, Gemini, ChatGPT)

### File: `public/robots.txt`
- Tambah `Sitemap:` directive
- Tambah izin untuk AI crawler bots: `GPTBot`, `Google-Extended`, `PerplexityBot`, `ClaudeBot`, `Applebot-Extended`
- Tambah `Crawl-delay` untuk bot umum

---

## 5. Dashboard Button Verification

Review semua tombol di dashboard admin:
- **Clients:** Add, Edit, Delete, Search -- semua sudah berfungsi dengan handler yang benar
- **Device Manager:** Restart Session, Logout -- sudah berfungsi
- **Knowledge Base:** Upload file, Delete doc, Test Bot -- sudah berfungsi
- **Monitoring:** Mark alert as read -- sudah berfungsi
- **Sidebar Logout** -- sudah berfungsi

Semua tombol sudah memiliki loading state dan error handling. Tidak ada perubahan diperlukan untuk fungsionalitas tombol.

---

## 6. Documentation (README.md)

README.md akan diperbarui lengkap dengan:
- Deskripsi proyek MANTRA AI
- Arsitektur (Frontend + Lovable Cloud backend)
- Struktur folder
- Panduan development lokal
- Panduan koneksi VPS (Nginx reverse proxy, PM2, environment variables)
- Panduan deployment
- Panduan kontribusi
- Daftar environment variables yang diperlukan

---

## 7. VPS Readiness

Dokumentasi dan konfigurasi agar platform siap dihubungkan ke VPS:
- Panduan Nginx reverse proxy configuration di README
- Panduan SSL/TLS setup
- Panduan environment variable management
- Catatan: Kode sudah static SPA (Vite build), tinggal `npm run build` dan serve folder `dist/`

---

## Detail Teknis

### Database Insert (Admin Role)
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('00cfa2ef-a8d6-4922-9b71-673380885ca4', 'admin');
```

### Logo Fix (semua img tags)
```tsx
<img src={logo} alt="Mantra AI" className="h-8 object-contain" width={120} height={32} />
```

### Footer Structure
```text
+------------------------------------------+
| Logo        | Nav Links    | Kontak       |
|             |              | Email        |
|             |              | Instagram    |
+------------------------------------------+
| Privacy Policy (link) | (c) 2026 Mantra  |
+------------------------------------------+
| Ghost keyword text (invisible SEO)       |
+------------------------------------------+
```

### Privacy Policy Dialog
Menggunakan komponen `Dialog` dari shadcn/ui yang sudah ter-install. Konten dalam Bahasa Indonesia meliputi: pengumpulan data, penggunaan data, perlindungan data, hak pengguna, kontak.

### JSON-LD Structured Data (index.html)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Mantra AI",
  "description": "Asisten Digital AI untuk UMKM Indonesia",
  "url": "https://mantra-admin-id.lovable.app",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hello00mantra@gmail.com"
  }
}
```

### robots.txt Update
```text
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://mantra-admin-id.lovable.app/sitemap.xml
```

### File Baru
| File | Keterangan |
|------|-----------|
| `public/sitemap.xml` | Sitemap XML untuk SEO crawler |

### File yang Diubah
| File | Perubahan |
|------|-----------|
| `index.html` | Lang=id, meta SEO, JSON-LD, verification placeholders |
| `src/components/landing/Footer.tsx` | Redesign + Privacy Policy dialog + kontak + ghost keywords |
| `src/components/landing/Navbar.tsx` | object-contain pada logo |
| `src/components/admin/AdminSidebar.tsx` | object-contain pada logo |
| `src/pages/Login.tsx` | object-contain pada logo |
| `public/robots.txt` | AI bots, sitemap directive |
| `README.md` | Full documentation + VPS guide |

