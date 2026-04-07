

# Redesign Landing Page — Hapus "Karakter AI"

## Masalah yang Teridentifikasi

Setelah review semua 14 komponen landing page, berikut pola yang terasa "AI-generated":

1. **Radius berlebihan** — `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` di mana-mana. Setiap elemen punya radius besar yang bikin semua terasa "blobby" dan generik.

2. **Tombol generik** — Semua tombol pakai `rounded-md` default, tidak ada personality. Outline button terlalu plain.

3. **Tanda hubung "-" tersebar** — "MANTRA.RUANG-KENDALI", "1-2 minggu", "3-4 jam", penggunaan em dash "—" di setiap deskripsi. Membuat copy terasa template.

4. **Layout repetitif** — Setiap section punya structure identik: `span.font-mono.uppercase` (label) → `h2.font-extrabold` → `p.text-muted` → grid cards. Semua section terasa copy-paste.

5. **Font mono berlebihan** — `font-mono` dipakai untuk label, stats, harga, step numbers. Terlalu banyak monospace = terasa robotic.

6. **Section header pattern** — Semua 12 section pakai exact same pattern: colored mono label → bold heading dengan `<span className="text-primary">` → subtitle. Sangat repetitive.

## Perubahan yang Akan Dilakukan

### A. Global: Button & Radius (`button.tsx` + `index.css`)

- Button: ganti `rounded-md` → `rounded-lg` untuk size lg, tambah `font-semibold`, sedikit shadow pada primary button
- Kurangi radius global `--radius` dari `0.75rem` ke `0.5rem` (lebih sharp, less blobby)
- Outline button: tambah hover transition yang lebih hidup (scale subtle)

### B. Copywriting: Hilangkan tanda hubung berlebihan

Semua file landing — ganti pattern:
- "MANTRA.RUANG-KENDALI" → "Pusat Kontrol MANTRA"
- "1-2 minggu" → "1 sampai 2 minggu" (di body text) atau biarkan di badge
- Hapus em dash "—" yang berlebihan, ganti dengan kalimat yang mengalir natural
- Kurangi penggunaan titik-koma dan bullet yang terlalu terstruktur

### C. Layout Variation — Break the Pattern

**Hero.tsx:**
- Hapus `font-mono` dari tagline
- Stats bar: hapus border, buat lebih clean dengan divider line saja
- Dashboard mock: ganti "MANTRA.RUANG-KENDALI" → "Pusat Kontrol"
- Kurangi `rounded-2xl` card → `rounded-lg`

**Problem.tsx:**
- Hapus `font-mono` dari heading "CS Manusia" / "Cara MANTRA"
- Cards: `rounded-xl` → `rounded-lg`

**Features.tsx:**
- Hapus `font-mono` dari label name (PENJAGA, INGATAN)
- Icon container: `rounded-xl` → `rounded-lg`

**HowItWorks.tsx:**
- Step number: hapus `font-mono`, buat lebih subtle
- Card: `rounded-2xl` → `rounded-lg`
- Time badge: `rounded-full` → `rounded-md`

**Testimonials.tsx:**
- Card: `rounded-2xl` → `rounded-lg`
- Metric box: `rounded-lg` → `rounded-md`
- Stats: hapus border, buat inline

**About.tsx:**
- Pain points: `rounded-xl` → `rounded-lg`
- Values: `rounded-2xl` → `rounded-lg`, icon box `rounded-xl` → `rounded-lg`
- Stats angka: hapus `font-mono`, pakai `font-sans font-bold`

**Pricing.tsx:**
- Harga: hapus `font-mono`
- Plan name: hapus `font-mono`, `tracking-widest`

**PaymentScheme.tsx:**
- Step circle: `rounded-full` tetap (ini natural untuk angka)
- Cards: `rounded-xl` → `rounded-lg`

**ROICalculator.tsx & AdminCostCalculator.tsx:**
- Result cards: `rounded-xl` → `rounded-lg`
- Angka: hapus `font-mono`

**FAQ.tsx:**
- Tab pills: `rounded-full` → `rounded-lg`
- Accordion items: `rounded-xl` → `rounded-lg`

**FinalCTA.tsx:**
- Container: `rounded-3xl` → `rounded-xl`
- Badge pills: `rounded-full` → `rounded-lg`

**ChatDemo.tsx:**
- Tab pills: `rounded-full` → `rounded-lg`

**Footer.tsx:**
- Minimal changes (sudah cukup clean)

### D. Section Headers — Add Variation

Tidak semua section butuh `span.font-mono.uppercase` label. Variasi:
- Beberapa section: hapus label, langsung heading
- Beberapa section: label tanpa `font-mono`, pakai `font-sans text-primary text-sm font-semibold`
- Buat setiap section terasa punya "suara" sendiri

### E. Kurangi font-mono

`font-mono` hanya dipakai untuk:
- Harga (angka besar)
- Dashboard mock (karena konteks teknis)
- Selebihnya diganti `font-sans`

## File Terdampak (14 file)

| File | Aksi |
|------|------|
| `src/index.css` | `--radius: 0.5rem` |
| `src/components/ui/button.tsx` | Tambah shadow, font-semibold |
| `src/components/landing/Hero.tsx` | Radius, copy, hapus font-mono |
| `src/components/landing/Problem.tsx` | Radius, hapus font-mono |
| `src/components/landing/Features.tsx` | Radius, hapus font-mono label |
| `src/components/landing/HowItWorks.tsx` | Radius, step style |
| `src/components/landing/Testimonials.tsx` | Radius, hapus font-mono stats |
| `src/components/landing/About.tsx` | Radius, hapus font-mono stats |
| `src/components/landing/Pricing.tsx` | Hapus font-mono harga/label |
| `src/components/landing/PaymentScheme.tsx` | Radius |
| `src/components/landing/ROICalculator.tsx` | Radius, hapus font-mono |
| `src/components/landing/AdminCostCalculator.tsx` | Radius, hapus font-mono |
| `src/components/landing/FAQ.tsx` | Radius tabs & accordion |
| `src/components/landing/FinalCTA.tsx` | Radius, badge pills |
| `src/components/landing/ChatDemo.tsx` | Radius tabs |

## Yang TIDAK Diubah
- Warna/tema (sudah bagus)
- Konten/data (pricing, testimonial, FAQ content)
- Struktur halaman (urutan section)
- Dashboard admin
- ChatDemo message bubbles (natural untuk chat UI)

