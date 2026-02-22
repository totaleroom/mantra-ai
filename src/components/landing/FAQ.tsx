import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Target, Settings, Wallet, Users } from "lucide-react";

const categories = [
  {
    label: "Keraguan Umum",
    icon: Target,
    questions: [
      {
        q: "Bisnis saya masih kecil, apa perlu automation segala?",
        a: "Justru bisnis kecil yang PALING butuh. Kenapa? Karena Anda tidak punya luxary hire 5 admin. Dengan MANTRA, 1 orang bisa handle pekerjaan 3-4 orang. Klien kami yang omzetnya masih Rp 10-20 juta/bulan justru merasakan dampak paling besar — karena setiap jam yang dihemat langsung terasa di profit margin. Mulai dari Rp 250K/bulan, lebih murah dari ongkos makan siang admin 1 bulan.",
      },
      {
        q: "Saya takut bot terasa kaku dan tidak personal, customer malah kabur",
        a: "Ini kekhawatiran yang sangat valid — dan jawaban kami: 87% customer klien kami TIDAK SADAR mereka sedang chat dengan AI. Kenapa? Karena MANTRA bukan chatbot template. Kami training AI dengan data produk, gaya bahasa, bahkan emoji favorit Anda. Hasilnya? Bot yang 'ngobrol' persis seperti admin terbaik Anda — tapi available 24/7 dan tidak pernah bad mood.",
      },
      {
        q: "Bagaimana kalau ada komplain atau case yang rumit?",
        a: "MANTRA punya sistem escalation otomatis. Ketika AI mendeteksi customer marah, case rumit, atau permintaan yang di luar scope — chat langsung di-handover ke tim Anda dengan context lengkap. Jadi customer tidak perlu ulang cerita, dan tim Anda cuma handle yang benar-benar butuh sentuhan manusia. Rata-rata, 80% chat bisa diselesaikan AI, 20% sisanya baru ke tim Anda.",
      },
      {
        q: "Kompetitor saya belum pakai AI, ngapain saya duluan?",
        a: "Justru ini golden window Anda. Customer yang chat ke Anda dapat reply dalam 3 detik. Customer yang chat ke kompetitor? Nunggu 3-4 jam. Siapa yang dapat orderan? Anda. First mover advantage di era AI itu nyata — dan window-nya tidak akan terbuka selamanya. Begitu kompetitor Anda mulai pakai, Anda sudah kehilangan keunggulan.",
      },
    ],
  },
  {
    label: "Teknis & Setup",
    icon: Settings,
    questions: [
      {
        q: "Apakah saya perlu kemampuan teknis untuk pakai MANTRA?",
        a: "Nol. Literally nol. Tim kami yang setup semuanya dari A-Z. Anda hanya perlu: (1) kasih akses WhatsApp Business, (2) kirim katalog produk/jasa, (3) jawab beberapa pertanyaan tentang bisnis Anda. Sisanya kami yang kerjakan. Anda tinggal approve hasilnya dan mulai terima orderan.",
      },
      {
        q: "Berapa lama proses setup sampai bisa jalan?",
        a: "Rata-rata 1-2 minggu dari konsultasi awal hingga go-live. Untuk bisnis dengan katalog sederhana, bisa lebih cepat — ada yang 5 hari sudah live. Yang paling lama biasanya bukan teknis, tapi menunggu owner approve konten dan flow chat-nya 😄",
      },
      {
        q: "Platform apa saja yang didukung?",
        a: "Saat ini kami fokus di WhatsApp Business dan Instagram DM — dua channel yang paling banyak dipakai UMKM Indonesia untuk jualan. Kenapa tidak semua platform sekaligus? Karena kami percaya lebih baik 2 channel yang bekerja sempurna daripada 10 channel yang setengah-setengah.",
      },
      {
        q: "Bagaimana jika saya sudah punya sistem lain (POS, CRM, dll)?",
        a: "MANTRA dirancang untuk melengkapi, bukan mengganti. Kami bisa integrasi dengan sistem yang sudah Anda pakai. Tidak perlu buang investasi yang sudah jalan. Saat konsultasi awal, tim kami akan mapping sistem existing Anda dan carikan solusi integrasi terbaik.",
      },
    ],
  },
  {
    label: "Investasi & ROI",
    icon: Wallet,
    questions: [
      {
        q: "Berapa cepat saya bisa melihat hasilnya?",
        a: "Minggu pertama Anda sudah akan merasakan perbedaan — terutama di waktu response ke customer dan beban kerja tim. ROI finansial positif biasanya tercapai di bulan ke-1 sampai ke-2. Salah satu klien kami bahkan breakeven di minggu ke-3 karena peningkatan conversion rate dari fast response.",
      },
      {
        q: "Kenapa harus bayar setup fee? Kan tinggal pasang aja?",
        a: "Kalau kami cuma 'pasang template' memang tidak perlu setup fee. Tapi yang kami lakukan adalah: riset bisnis Anda, training AI dengan data produk Anda, bikin flow percakapan custom, testing berulang sampai hasilnya natural. Analoginya seperti buka franchise — Anda bayar untuk sistem yang sudah proven, bukan untuk software kosong. Setup fee = investasi untuk AI yang benar-benar paham bisnis Anda.",
      },
      {
        q: "Ada biaya tersembunyi atau biaya per-pesan?",
        a: "Tidak ada. Harga yang kami quote adalah harga final. Tidak ada biaya per-pesan, tidak ada 'fair use policy' yang ambigu, tidak ada upgrade paksa. Yang tertera di halaman harga = yang Anda bayar. Titik.",
      },
    ],
  },
  {
    label: "Cocok untuk Siapa?",
    icon: Users,
    questions: [
      {
        q: "Industri apa saja yang cocok pakai MANTRA?",
        a: "Semua jenis UMKM yang menerima chat dari customer — F&B (restoran, catering, coffee shop), fashion & hijab, kosmetik, elektronik, jasa (cleaning, laundry, fotografi), properti, otomotif, dan banyak lagi. Intinya: kalau bisnis Anda punya WhatsApp dan menerima pertanyaan/orderan via chat, MANTRA cocok untuk Anda.",
      },
      {
        q: "Apakah cocok untuk bisnis yang baru mulai go-digital?",
        a: "Sangat cocok! Paket STARTER kami memang dirancang untuk ini. Anda tidak perlu punya website, tidak perlu paham teknologi. Cukup punya WhatsApp Business dan produk/jasa yang mau dijual. Kami bantu sisanya. Banyak klien kami memulai dengan 0 sistem digital — sekarang mereka punya AI assistant yang handle ratusan chat per hari.",
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
          <p className="text-muted-foreground">
            Kami sudah dengar semua keraguan ini ratusan kali. Ini jawaban jujur kami.
          </p>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveTab(i)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <cat.icon size={14} />
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
            <p className="mb-3 text-sm text-muted-foreground">Masih ada pertanyaan lain?</p>
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
