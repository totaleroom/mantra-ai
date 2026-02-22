import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle } from "lucide-react";

const categories = [
  {
    label: "Keraguan Umum",
    questions: [
      {
        q: "Apakah MANTRA cocok untuk bisnis saya yang masih kecil?",
        a: "Sangat cocok! MANTRA dirancang khusus untuk UMKM Indonesia. Paket STARTER kami dimulai dari Rp 250K/bulan — lebih murah dari gaji admin part-time.",
      },
      {
        q: "Apakah data bisnis saya aman?",
        a: "100% aman. Kami menggunakan enkripsi standar enterprise dan server yang terletak di Indonesia. Data Anda tidak akan dibagikan ke pihak ketiga manapun.",
      },
      {
        q: "Bagaimana jika saya tidak puas?",
        a: "Kami memberikan garansi 30 hari uang kembali. Jika dalam 30 hari Anda merasa MANTRA tidak memberikan nilai, kami kembalikan 100% biaya Anda.",
      },
    ],
  },
  {
    label: "Teknis & Setup",
    questions: [
      {
        q: "Apakah saya perlu kemampuan teknis untuk menggunakan MANTRA?",
        a: "Tidak sama sekali! Tim kami yang akan setup semuanya. Anda hanya perlu menyediakan akses ke akun WhatsApp Business dan marketplace Anda.",
      },
      {
        q: "Berapa lama proses setup?",
        a: "Rata-rata 1-2 minggu dari konsultasi awal hingga go-live. Untuk kasus sederhana, bisa lebih cepat.",
      },
      {
        q: "Platform apa saja yang didukung?",
        a: "WhatsApp Business, Instagram DM, Shopee, Tokopedia, Lazada, dan Bukalapak. Kami terus menambah integrasi baru.",
      },
    ],
  },
  {
    label: "Investasi & ROI",
    questions: [
      {
        q: "Berapa cepat saya bisa melihat hasilnya?",
        a: "Kebanyakan klien kami melihat penghematan waktu signifikan dalam minggu pertama. ROI positif biasanya tercapai dalam 1-2 bulan pertama.",
      },
      {
        q: "Apakah ada biaya tersembunyi?",
        a: "Tidak ada. Biaya yang tertera sudah termasuk semua fitur dalam paket. Tidak ada biaya per-pesan atau biaya tambahan lainnya.",
      },
    ],
  },
  {
    label: "Cocok untuk Siapa?",
    questions: [
      {
        q: "Industri apa saja yang cocok menggunakan MANTRA?",
        a: "Semua jenis UMKM yang menjual produk/jasa — F&B, fashion, elektronik, kosmetik, jasa catering, properti, dan banyak lagi.",
      },
      {
        q: "Apakah cocok untuk bisnis yang baru mulai?",
        a: "Ya! Paket STARTER kami dirancang untuk bisnis yang baru go-digital. Anda bisa upgrade kapan saja seiring pertumbuhan bisnis.",
      },
    ],
  },
];

const FAQ = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="faq" className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            FAQ
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Pertanyaan yang Sering Ditanyakan
          </h2>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveTab(i)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {categories[activeTab].questions.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-background px-4">
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Masih ada pertanyaan?</p>
            <a
              href="https://wa.me/6282125086328"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <MessageCircle size={16} /> Chat langsung via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
