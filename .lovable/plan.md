

# Update SEO Verification, Fix ROI Calculator, dan Tambah Demo Chat AI

## 1. Update Google & Bing Verification Codes

**File:** `index.html` (line 25-26)

Ganti placeholder dengan kode verifikasi asli:
- Google: `hcD252UNc4uj-grnqcwwNNNkFK_KUdXDW_L1o6FZDkg`
- Bing: `A6F0E93C359BCC02A63C6C8823DC5CAF`

Juga copy file verifikasi yang di-upload ke folder `public/`:
- `google284e90c4dc0d5a61.html`
- `BingSiteAuth_2.xml`

---

## 2. Fix ROI Calculator — Text Tumpang Tindih

**File:** `src/components/landing/ROICalculator.tsx`

Masalah: Grid 4 kolom (`lg:grid-cols-4`) menyebabkan text value (terutama format Rupiah panjang seperti "Rp4.850.000") overflow di layar kecil/medium.

Perbaikan:
- Ubah grid menjadi `sm:grid-cols-2` saja (hapus `lg:grid-cols-4`) agar setiap card lebih lega
- Kurangi font size value dari `text-2xl` ke `text-xl` agar angka Rupiah tidak overflow
- Tambahkan `break-all` atau `truncate` sebagai safety net

---

## 3. Tambah Demo Chat AI (Komponen Baru)

**File baru:** `src/components/landing/ChatDemo.tsx`

Komponen animasi chat WhatsApp-style yang menampilkan percakapan antara konsumen dan AI MANTRA (yang dikira admin manusia) untuk bisnis kue/cake.

### Skenario Percakapan F&B (Kue/Bolu):

| # | Pengirim | Pesan |
|---|----------|-------|
| 1 | Konsumen | "Halo kak, mau tanya dong. Ada bolu pandan ga?" |
| 2 | AI (MANTRA) | "Halo kak! Ada dong, Bolu Pandan Keju kami lagi best seller. Mau ukuran yang mana kak? Mini (15cm) Rp45.000 atau Regular (22cm) Rp85.000?" |
| 3 | Konsumen | "Wah murah ya! Regular aja kak. Bisa kirim ke Cilandak ga?" |
| 4 | AI (MANTRA) | "Bisa banget kak! Ongkir ke Cilandak Rp15.000. Totalnya Rp100.000 ya. Mau dikirim kapan kak?" |
| 5 | Konsumen | "Besok siang bisa kak? Sekitar jam 12" |
| 6 | AI (MANTRA) | "Siap kak, besok siang jam 12 ya. Ini rekap ordernya: Bolu Pandan Keju Regular (22cm) — Rp85.000, Ongkir Cilandak — Rp15.000. Total: Rp100.000. Pembayaran bisa transfer ke BCA 1234567890 a.n. Dapur Bunda Ani. Konfirmasi setelah transfer ya kak!" |
| 7 | Konsumen | "Udah transfer kak, ini buktinya" |
| 8 | AI (MANTRA) | "Terima kasih kak! Pembayaran sudah kami terima. Pesanan sedang diproses dan akan dikirim besok jam 12. Kakak akan dapat notifikasi pas kurir berangkat ya. Terima kasih sudah order di Dapur Bunda Ani!" |

### Fitur Animasi:
- Chat bubbles muncul satu per satu dengan delay (typing indicator "..." sebelum pesan AI muncul)
- Styling mirip WhatsApp (bubble hijau untuk konsumen, putih untuk AI)
- Auto-scroll ke bawah saat pesan baru muncul
- Label kecil di atas: "Konsumen pikir ini admin manusia... padahal ini MANTRA AI"
- Tombol "Putar Ulang" untuk restart animasi
- Di bawah demo: badge kecil "Semua dijawab otomatis oleh MANTRA AI dalam hitungan detik"

### Posisi di Landing Page:

**File:** `src/pages/Index.tsx`

Ditempatkan tepat setelah Hero dan sebelum Problem:
```
Hero -> ChatDemo -> Problem -> ...
```

---

## Ringkasan Perubahan

| File | Aksi |
|------|------|
| `index.html` | Update meta verification codes |
| `public/google284e90c4dc0d5a61.html` | Copy dari upload |
| `public/BingSiteAuth_2.xml` | Copy dari upload |
| `src/components/landing/ROICalculator.tsx` | Fix grid/font agar tidak tumpang tindih |
| `src/components/landing/ChatDemo.tsx` | Komponen baru — animasi demo chat |
| `src/pages/Index.tsx` | Tambah ChatDemo setelah Hero |

