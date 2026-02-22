

# Rework Landing Page: Harga, Features, dan Problem Section

## Ringkasan Perubahan

3 section yang akan diubah:

### 1. Section Harga (Pricing.tsx)
**Dari 3 paket menjadi 2 paket saja**, hapus toggle bulanan/tahunan, hapus semua referensi "SUARA":

| Paket | Harga | Target |
|-------|-------|--------|
| **STARTER** | Rp 250.000/bulan + Setup Rp 2.000.000 | Usaha baru mulai go-digital, 1 channel WhatsApp |
| **GROWTH** (Populer) | Rp 350.000/bulan + Setup Rp 3.000.000 | UMKM yang ingin scale up, multi-channel |

- Hapus paket ENTERPRISE
- Hapus toggle bulanan/tahunan (tampilkan harga bulanan saja, lebih jujur dan simpel)
- Hapus semua baris "Content creator (SUARA)" dari fitur
- Layout berubah dari 3 kolom ke 2 kolom (`md:grid-cols-2` dengan `max-w-3xl`)

### 2. Section Peralatan MANTRA (Features.tsx)
- **Hapus card SUARA** (Content Creator) seluruhnya
- Sisa 2 card: PENJAGA (AI Customer Service) dan INGATAN (Data & Stock Hub)
- Layout berubah dari 3 kolom ke 2 kolom (`md:grid-cols-2`)
- Hapus referensi "Shopee, Tokopedia" dari bullet PENJAGA karena integrasi marketplace chat belum realistis (lihat penjelasan di bawah)
- Ubah bullet menjadi "Multi-platform: WhatsApp & Instagram" saja

### 3. Section Masalah (Problem.tsx)
**Rewrite total** headline dan konten. Konsep baru: **CS Manusia vs MANTRA** -- bukan "chatbot vs MANTRA".

**Headline baru:**
> "CS Manusia Punya Batas. **MANTRA Tidak.**"

**Subtitle baru:**
> "Karyawan bisa capek, bad mood, lupa SOP. MANTRA selalu ramah, patuh, dan tahu cara menangani pelanggan yang marah sekalipun."

**Konten perbandingan baru (Cara Lama = CS Manusia):**

| CS Manusia | MANTRA |
|-----------|--------|
| Mood karyawan berubah-ubah, kadang ketus ke pelanggan | Selalu ramah & sabar, bahkan saat pelanggan marah |
| Sering lupa SOP, jawaban tidak konsisten | 100% patuh SOP, jawaban selalu sesuai arahan owner |
| Hanya bisa kerja 8 jam, libur di hari besar | Online 24/7, tidak kenal libur atau jam istirahat |
| Butuh training berulang setiap ada produk/promo baru | Update knowledge base sekali, langsung paham semua |

---

## Soal Omni-Channel (Tokopedia, Shopee)

Jawaban jujur: **Tokopedia dan Shopee tidak membuka API chat mereka untuk umum.**

- **Tokopedia**: Chat API hanya tersedia untuk mitra resmi Tokopedia (program Mitra Tokopedia). Tidak bisa diakses developer biasa.
- **Shopee**: Open Platform punya fitur chat terbatas, tapi butuh approval sebagai partner resmi dan prosesnya panjang.
- **Instagram**: Bisa diintegrasikan via **Meta Messenger API** (satu ekosistem dengan WhatsApp Cloud API). Ini realistis.

**Rekomendasi realistis untuk MANTRA:**
- **WhatsApp** -- channel utama, sudah direncanakan
- **Instagram DM** -- bisa ditambahkan nanti via Meta API (gratis, satu token dengan WhatsApp)
- **Tokopedia/Shopee** -- belum bisa, kecuali jadi mitra resmi

Oleh karena itu, di landing page kita sebaiknya tulis "WhatsApp & Instagram" saja, bukan klaim marketplace yang belum bisa.

---

## Detail Teknis

### File yang diubah:

**`src/components/landing/Pricing.tsx`**
- Hapus `useState` dan toggle bulanan/tahunan
- Kurangi array `plans` dari 3 menjadi 2 (hapus ENTERPRISE)
- Hapus fitur "Content creator (SUARA)" dari kedua paket
- Ubah grid dari `md:grid-cols-3` ke `md:grid-cols-2` dengan `max-w-3xl mx-auto`
- Harga ditampilkan statis (bulanan saja)

**`src/components/landing/Features.tsx`**
- Hapus objek SUARA dari array `features`
- Ubah bullet PENJAGA dari "WA, IG, Shopee, Tokopedia" ke "WhatsApp & Instagram"
- Ubah grid dari `md:grid-cols-3` ke `md:grid-cols-2`
- Hapus import `Megaphone` (tidak dipakai lagi)

**`src/components/landing/Problem.tsx`**
- Rewrite headline: "CS Manusia Punya Batas. MANTRA Tidak."
- Rewrite subtitle tentang mood, SOP, kepatuhan
- Rewrite 4 item perbandingan (CS Manusia vs MANTRA)
- Ganti label "Cara Lama" menjadi "CS Manusia" dan "Cara MANTRA" tetap

