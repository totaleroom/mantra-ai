# Mantra AI — High-Fidelity Landing Page Clone

A pixel-perfect recreation of the MantraID landing page — a modern SaaS site for Indonesian SME automation. Built with React, Tailwind CSS, Shadcn UI, and Lucide icons.

## Design System

- **Background:** Warm off-white (#FFF8F0)
- **Text:** Dark slate/near-black
- **Primary CTA:** Orange (#F97316) buttons
- **Accents:** Green for "after/positive", Red for "before/negative"
- **Font:** Inter (clean sans-serif), monospace for stats
- **Style:** Minimalist, generous whitespace, enterprise-accessible feel

## Component Architecture

Each section is a standalone component for modularity.

## Pages & Routing

- `/` — Full landing page
- `/login` — Placeholder login page (Navbar "Juragan" button links here)

---

## 1. Navbar

- Logo: Orange "M" square badge + bold "MANTRA" text
- Scroll-linked nav: Masalah, Solusi, Harga, FAQ
- Two action buttons: "Juragan" (outline, links to `/login`), "Konsultasi Gratis" (orange CTA, links to WhatsApp)
- Mobile hamburger menu
- Sticky on scroll

## 2. Hero Section

- Top badge: "ASISTEN DIGITAL UNTUK USAHA ANDA" (monospace, dark pill)
- Bold headline: "Pasang Karyawan Gaib. Kerja 24 Jam, Tanpa THR."
- Descriptive paragraph in friendly Indonesian
- Orange CTA: "Konsultasi Gratis 15 Menit" with arrow icon
- Right side: Mock "MANTRA.RUANG-KENDALI" dashboard card showing Before/After comparison (red ❌ vs green ✅) and stats (87% chat dijawab robot, 3.2 jam dihemat)
- Stats bar below: "3-4 jam" time saved, "300%" profit, "30+" businesses

## 3. Problem Section ("Masalah")

- Header: "Apakah Ini yang Bapak/Ibu Rasakan?"
- Two-column layout: "Cara Lama" (red-tinted pain point cards) vs "Cara MANTRA" (green-tinted solution cards)
- 4 pain/solution pairs: chat fatigue, stock mismatch, manual orders, no growth time

## 4. Admin Cost Calculator Section

- City-based salary cards (Jakarta, Bandung, Surabaya, etc.) with UMK data
- Interactive calculator: select city, adjust number of admins
- Cost comparison: Admin cost vs MANTRA cost with savings highlighted
- Table: Admin tasks that MANTRA can automate with percentages

## 5. Features/Tools Section ("Peralatan MANTRA")

- Header: "3 Alat Bantu untuk Kembangkan Usaha"
- Three detailed feature cards:
  - **PENJAGA** — AI Customer Service (auto-reply WhatsApp, IG, marketplaces)
  - **INGATAN** — Data & Stock Hub (centralized CRM, multi-platform sync)
  - **SUARA** — Content Creator (captions, product descriptions, video scripts)
- Each with icon, bullet points, and "Lihat Harga" link

## 6. ROI Calculator Section

- Slider-based calculator for daily time spent on tasks
- Auto-calculated results: hours saved/month, monetary value, net savings, ROI percentage

## 7. How It Works Section ("Semudah 1-2-3")

- Three numbered steps with timeframes:
  1. Konsultasi Gratis (15 menit)
  2. Setup & Training (1-2 minggu)
  3. Go Live & Support (Ongoing)
- Each with bullet point details

## 8. Testimonials Section

- Header: "30+ UMKM Sudah Buktikan"
- 4 testimonial cards with avatar initial, name, business, city
- Each with a quote and a key metric improvement (e.g., "4 jam → 30 menit")
- Stats bar: 30+ UMKM, 500+ hours saved, 4.9 rating, <24 jam support

## 9. Pricing Section

- Toggle: Bulanan / Tahunan
- Three tier cards:
  - **STARTER** — Rp 250K/bulan + Rp 2M setup
  - **GROWTH** (highlighted "PALING POPULER") — Rp 350K/bulan + Rp 3M setup
  - **ENTERPRISE** — Custom pricing
- Feature checklists with included/excluded items
- "Cocok untuk" target segment label
- WhatsApp CTA buttons

## 10. Payment Scheme Section

- 3-step payment flow: Deposit 50% → Pelunasan 50% → Biaya Bulanan
- Deposit policy details
- Payment methods: Bank transfer, E-wallet, Virtual Account

## 11. About Section ("Tentang Kami")

- Company story and mission
- Pain points they solve (6 items)
- Core values: Speed Over Perfection, Transparansi Total, Partner Bukan Vendor
- Stats: 30+ UMKM, 15,000+ hours saved, <3 detik response, 97% retention

## 12. FAQ Section

- Tabbed categories: Keraguan Umum, Teknis & Setup, Investasi & ROI, Cocok Untuk Siapa?
- Accordion-style Q&A using Shadcn Accordion
- WhatsApp link for additional questions

## 13. Final CTA Section

- Bold closing: "Masih Mau Balas Chat Sampai Tengah Malam?"
- Trust badges: timeline, ROI, support, free consultation
- Two CTA options: Schedule consultation + direct WhatsApp chat

## 14. Footer

- Simple copyright: "© 2026 Mantra AI"
- Essential links

## Responsive Design

- Mobile-first with hamburger nav
- Stacked layouts on small screens, side-by-side on desktop
- Touch-friendly CTAs and interactive elements