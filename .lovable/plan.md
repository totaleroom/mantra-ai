

# Review & Improvement Landing Page MANTRA -- Perspektif Sales & Marketing

## Analisis Masalah Saat Ini

Setelah review seluruh landing page, berikut temuan dan rencana perbaikan:

### 1. FAQ -- Rewrite Total (Prioritas Tinggi)

**Masalah**: FAQ saat ini terlalu "corporate" dan defensif. Jawaban pendek, tidak ada hook emosional, tidak ada social proof dalam jawaban. Juga masih menyebut "Shopee, Tokopedia, Lazada, Bukalapak" yang tidak realistis.

**Solusi**: Rewrite seluruh FAQ dengan gaya percakapan yang lebih persuasif, terinspirasi dari screenshot yang diberikan. Pertanyaan ditulis dari sudut keraguan nyata calon customer, jawaban mematahkan keraguan dengan data + retorika.

**Konten FAQ baru:**

| Kategori | Pertanyaan | Gaya Jawaban |
|----------|-----------|--------------|
| Keraguan Umum | "Bisnis saya masih kecil, apa perlu automation?" | FOMO + logika scaling |
| Keraguan Umum | "Saya takut bot terasa tidak personal, customer kabur" | Social proof 87% tidak sadar chat dengan AI |
| Keraguan Umum | "Bagaimana kalau ada komplain atau case rumit?" | Escalation otomatis, human touch tetap ada |
| Keraguan Umum | "Kompetitor saya belum pakai AI, ngapain saya duluan?" | First mover advantage, response 3 detik vs 3-4 jam |
| Teknis & Setup | "Apakah saya perlu kemampuan teknis?" | Tim MANTRA urus semua, owner tinggal approve |
| Teknis & Setup | "Berapa lama proses setup?" | 1-2 minggu, bisa lebih cepat |
| Teknis & Setup | "Platform apa saja yang didukung?" | WhatsApp & Instagram (hapus marketplace) |
| Teknis & Setup | "Bagaimana jika saya sudah punya sistem lain?" | Integrasi fleksibel, tidak perlu ganti semua |
| Investasi & ROI | "Berapa cepat saya bisa lihat hasilnya?" | Minggu pertama sudah terasa, ROI 1-2 bulan |
| Investasi & ROI | "Kenapa harus bayar setup fee?" | Analogin dengan franchise, bukan template |
| Investasi & ROI | "Ada biaya tersembunyi?" | Tidak ada, harga final |
| Cocok untuk Siapa? | "Industri apa saja yang cocok?" | F&B, fashion, jasa, dll + contoh nyata |
| Cocok untuk Siapa? | "Apakah cocok untuk bisnis yang baru mulai?" | Starter dirancang untuk ini |

### 2. About Section -- Tambah "Pain yang Kami Selesaikan" (Sesuai Screenshot)

**Masalah**: Section About saat ini terlalu generik. Screenshot menunjukkan konsep "Pain yang Kami Selesaikan" yang jauh lebih powerful karena langsung menyentuh masalah nyata owner UMKM.

**Solusi**: 
- Ubah headline menjadi "Kami Paham **Sakitnya** Bisnis Anda"
- Ubah subtitle menjadi copy yang lebih empatis
- Tambahkan blok "Pain yang Kami Selesaikan" dengan 6 pain point spesifik (dari screenshot):
  - Owner kerja 14 jam/hari tapi bisnis jalan di tempat
  - Stok tidak sinkron, overselling terus-terusan
  - Admin resign, bisnis langsung chaos karena no system
  - Data customer berserakan di mana-mana
  - Customer complain slow response, padahal tim sudah kewalahan
  - Scaling bisnis = scaling headache
- Update copywriting values cards agar lebih tajam (sesuai screenshot):
  - "Speed Over Perfection" -> "Kami lebih pilih 80% automation yang jalan minggu depan..."
  - "Transparansi Total" -> "Harga yang kami quote adalah harga final..."
  - "Partner, Bukan Vendor" -> "Kami tidak jual software lalu tinggal..."

### 3. Testimonials -- Fix Referensi "SUARA"

**Masalah**: Testimoni Mas Fikri masih menyebut "SUARA bantu bikin caption..." padahal fitur SUARA sudah dihapus.

**Solusi**: Ganti quote Mas Fikri menjadi sesuatu tentang CS/sales automation, bukan content creation.

### 4. Section Order -- Optimasi Funnel Konversi

**Masalah**: Urutan section saat ini belum optimal untuk funnel konversi. `About` ada di akhir sebelum FAQ, padahal trust-building harus lebih awal.

**Solusi**: Pindahkan About (dengan pain points baru) ke posisi sebelum Pricing, karena visitor perlu merasa "mereka paham masalah saya" sebelum melihat harga.

Urutan baru:
1. Hero
2. ChatDemo
3. Problem (CS Manusia vs MANTRA)
4. AdminCostCalculator
5. Features
6. ROICalculator
7. HowItWorks
8. Testimonials
9. **About** (dengan Pain Points) -- dipindah ke sini
10. Pricing
11. PaymentScheme
12. FAQ
13. FinalCTA

---

## Detail Teknis

### File yang diubah:

**`src/components/landing/FAQ.tsx`**
- Rewrite seluruh array `categories` dengan konten FAQ baru yang lebih persuasif
- Hapus referensi "Shopee, Tokopedia, Lazada, Bukalapak" dari jawaban
- Tambah icon per tab kategori (sesuai screenshot: target, settings, wallet, users)

**`src/components/landing/About.tsx`**
- Ubah headline ke "Kami Paham Sakitnya Bisnis Anda"
- Ubah subtitle ke copy empati dari screenshot
- Tambah blok "Pain yang Kami Selesaikan" dengan 6 pain point dalam grid 3x2
- Update copywriting values cards agar lebih panjang dan persuasif (sesuai screenshot)

**`src/components/landing/Testimonials.tsx`**
- Ganti quote Mas Fikri dari "SUARA" ke testimoni tentang CS/sales automation

**`src/pages/Index.tsx`**
- Pindahkan posisi `About` dari setelah PaymentScheme ke sebelum Pricing

