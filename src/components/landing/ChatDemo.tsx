import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, RefreshCw, ShoppingBag, Utensils, Stethoscope, Wrench, Home, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  sender: "customer" | "ai";
  text: string;
}

interface Industry {
  id: string;
  label: string;
  icon: typeof ShoppingBag;
  businessName: string;
  messages: Message[];
}

const INDUSTRIES: Industry[] = [
  {
    id: "retail",
    label: "Retail",
    icon: ShoppingBag,
    businessName: "Lunestep Sneakers",
    messages: [
      { sender: "customer", text: "Halo kak, ada sneakers warna putih ukuran 42 ga?" },
      { sender: "ai", text: "Halo kak! Ada dong 😊 Untuk ukuran 42 warna putih, kami punya:\n\n• Lunestep Classic — Rp389.000\n• Lunestep Air Pro — Rp549.000 ⭐ Best Seller\n\nMau lihat foto detailnya kak?" },
      { sender: "customer", text: "Air Pro dong kak, bisa COD ga ke Jakarta Selatan?" },
      { sender: "ai", text: "Bisa banget kak! COD Jakarta Selatan tersedia ✅\n\nOngkir gratis untuk pembelian di atas Rp500.000, jadi kakak FREE ongkir ya! 🎉\n\nEstimasi sampai 1 sampai 2 hari kerja. Mau langsung diproses kak?" },
      { sender: "customer", text: "Langsung aja kak, gimana caranya?" },
      { sender: "ai", text: "Siap kak! 🛒\n\nRekap order:\n• Lunestep Air Pro 42 Putih — Rp549.000\n• Ongkir: GRATIS\n• Bayar: COD saat barang sampai\n\nBoleh kirim nama lengkap + alamat lengkap ya kak. Pesanan akan langsung kami proses hari ini! 📦" },
    ],
  },
  {
    id: "kuliner",
    label: "Kuliner",
    icon: Utensils,
    businessName: "Dapur Bunda Ani",
    messages: [
      { sender: "customer", text: "Halo kak, mau tanya dong. Ada bolu pandan ga?" },
      { sender: "ai", text: "Halo kak! Ada dong 😊 Bolu Pandan Keju kami lagi best seller. Mau ukuran yang mana kak?\n\n• Mini (15cm) — Rp45.000\n• Regular (22cm) — Rp85.000" },
      { sender: "customer", text: "Regular aja kak. Bisa kirim ke Cilandak?" },
      { sender: "ai", text: "Bisa banget kak! Ongkir ke Cilandak Rp15.000. Totalnya Rp100.000 ya 🛵\n\nMau dikirim kapan kak?" },
      { sender: "customer", text: "Besok siang bisa kak? Sekitar jam 12" },
      { sender: "ai", text: "Siap kak, besok siang jam 12 ya ✅\n\nRekap order:\n• Bolu Pandan Keju Regular — Rp85.000\n• Ongkir Cilandak — Rp15.000\n• Total: Rp100.000\n\nTransfer ke BCA 1234567890 a.n. Dapur Bunda Ani\nKonfirmasi setelah transfer ya kak! 🙏" },
    ],
  },
  {
    id: "klinik",
    label: "Klinik",
    icon: Stethoscope,
    businessName: "Klinik Sehat Sentosa",
    messages: [
      { sender: "customer", text: "Halo, mau booking dokter gigi dong" },
      { sender: "ai", text: "Halo kak! 😊 Untuk dokter gigi, kami ada jadwal berikut:\n\n🦷 drg. Amanda — Senin & Rabu (09:00-15:00)\n🦷 drg. Budi — Selasa & Kamis (13:00-20:00)\n\nMau pilih dokter yang mana kak?" },
      { sender: "customer", text: "drg. Amanda hari Rabu bisa kak?" },
      { sender: "ai", text: "drg. Amanda hari Rabu tersedia kak! ✅\n\nSlot yang masih kosong:\n• 09:00 ✅\n• 10:00 ✅\n• 11:00 ❌ (penuh)\n• 13:00 ✅\n• 14:00 ✅\n\nMau jam berapa kak?" },
      { sender: "customer", text: "Jam 10 pagi ya kak" },
      { sender: "ai", text: "Booking berhasil! ✅\n\n📋 Detail Appointment:\n• Dokter: drg. Amanda\n• Hari: Rabu, 10:00 WIB\n• Biaya konsultasi: Rp150.000\n\nKakak akan dapat reminder H-1 ya. Mohon datang 15 menit sebelumnya untuk registrasi. Sampai jumpa kak! 🏥" },
    ],
  },
  {
    id: "jasa",
    label: "Jasa",
    icon: Wrench,
    businessName: "HomeServ Indonesia",
    messages: [
      { sender: "customer", text: "Kak, AC saya bocor nih. Bisa servis ga?" },
      { sender: "ai", text: "Halo kak! Bisa banget 🔧\n\nUntuk AC bocor, biasanya perlu cuci + isi freon. Layanan kami:\n\n• Cuci AC — Rp100.000/unit\n• Isi Freon R32 — Rp250.000\n• Paket Lengkap — Rp300.000 (hemat Rp50.000) 💰\n\nAC-nya tipe apa kak? (1/2 PK, 1 PK, dll)" },
      { sender: "customer", text: "1 PK kak, paket lengkap aja. Bisa besok?" },
      { sender: "ai", text: "Siap kak! Untuk besok ada slot:\n\n🕘 09:00 - 11:00 ✅\n🕐 13:00 - 15:00 ✅\n🕓 16:00 - 18:00 ❌\n\nMau jam berapa kak? Teknisi kami berpengalaman 5+ tahun dan bergaransi 30 hari 👍" },
      { sender: "customer", text: "Pagi aja kak jam 9" },
      { sender: "ai", text: "Booking berhasil! ✅\n\n📋 Detail Servis:\n• Paket Lengkap AC 1 PK — Rp300.000\n• Jadwal: Besok, 09:00 WIB\n• Garansi: 30 hari\n\nTeknisi akan hubungi kakak 30 menit sebelum datang. Pembayaran setelah servis selesai ya kak. Terima kasih! 🙏" },
    ],
  },
  {
    id: "properti",
    label: "Properti",
    icon: Home,
    businessName: "Griya Asri Residence",
    messages: [
      { sender: "customer", text: "Halo, mau tanya rumah tipe 45 masih ada ga?" },
      { sender: "ai", text: "Halo kak! 🏡 Tipe 45 masih tersedia. Ada 2 lokasi:\n\n• Blok C-12 (hook) — Rp485 juta\n• Blok D-7 (standar) — Rp450 juta\n\nKeduanya sudah termasuk SHM. Mau info lebih detail atau jadwalkan survey kak?" },
      { sender: "customer", text: "Yang hook berapa DP-nya kak? Bisa KPR?" },
      { sender: "ai", text: "Bisa KPR kak! ✅ Kami sudah kerjasama dengan beberapa bank:\n\n💰 DP mulai 10% = Rp48,5 juta\n🏦 Cicilan estimasi Rp3,8 jt/bulan (tenor 20 thn)\n\nMau saya jadwalkan survey ke lokasi? Hari apa yang cocok kak?" },
      { sender: "customer", text: "Sabtu ini bisa kak?" },
      { sender: "ai", text: "Survey dijadwalkan! ✅\n\n📋 Detail:\n• Sabtu, 10:00 WIB\n• Lokasi: Griya Asri Residence, Blok C-12\n• Marketing: Pak Dedi (akan hubungi H-1)\n\nJangan lupa bawa KTP ya kak untuk registrasi. Sampai jumpa! 🏠" },
    ],
  },
  {
    id: "pendidikan",
    label: "Kursus",
    icon: GraduationCap,
    businessName: "Bimba English Course",
    messages: [
      { sender: "customer", text: "Halo, mau daftarin anak saya kursus bahasa inggris" },
      { sender: "ai", text: "Halo kak! 📚 Untuk anak usia berapa ya kak?\n\nKami ada program:\n• Kids (5-8 thn) — Rp350.000/bulan\n• Junior (9-12 thn) — Rp400.000/bulan\n• Teen (13-17 thn) — Rp450.000/bulan\n\nSemua include buku dan akses e-learning 😊" },
      { sender: "customer", text: "Anak saya 7 tahun kak. Jadwalnya kapan aja?" },
      { sender: "ai", text: "Untuk program Kids, jadwal yang tersedia:\n\n📅 Senin & Rabu (15:00-16:30)\n📅 Selasa & Kamis (15:00-16:30)\n📅 Sabtu (09:00-11:00)\n\nSemua kelas max 8 anak supaya lebih fokus. Pilih yang mana kak?" },
      { sender: "customer", text: "Sabtu aja kak biar ga bentrok sekolah" },
      { sender: "ai", text: "Pendaftaran berhasil! ✅\n\n📋 Detail:\n• Program: Kids English (7 thn)\n• Jadwal: Sabtu 09:00-11:00\n• Biaya: Rp350.000/bulan\n• Mulai: Sabtu depan\n\nTransfer ke BCA 9876543210 a.n. Bimba English Course. Setelah transfer, kirim buktinya ya kak. Kami siapkan bukunya! 📖" },
    ],
  },
];

const CUSTOMER_DELAY = 1200;
const AI_TYPING_DELAY = 1500;

const ChatDemo = () => {
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndustry = INDUSTRIES[activeIndustry];
  const messages = currentIndustry.messages;

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const switchIndustry = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveIndustry(index);
    setVisibleCount(0);
    setIsTyping(false);
    setIsRunning(true);
  };

  useEffect(() => {
    if (!isRunning || visibleCount >= messages.length) {
      if (visibleCount >= messages.length) setIsRunning(false);
      return;
    }

    const nextMsg = messages[visibleCount];
    const isAi = nextMsg.sender === "ai";

    if (isAi) {
      setIsTyping(true);
      scrollToBottom();
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setVisibleCount((c) => c + 1);
      }, AI_TYPING_DELAY);
    } else {
      timeoutRef.current = setTimeout(() => {
        setVisibleCount((c) => c + 1);
      }, CUSTOMER_DELAY);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visibleCount, isRunning, messages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, isTyping, scrollToBottom]);

  const restart = () => {
    setVisibleCount(0);
    setIsTyping(false);
    setIsRunning(true);
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Bukan Cuma Balas Chat,{" "}
            <span className="gradient-text">MANTRA Bisa Closing.</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Pelanggan pikir ini admin manusia… padahal ini{" "}
            <span className="font-bold text-primary">MANTRA AI</span> yang kerja 24/7 🤖
          </p>
        </div>

        {/* Industry Tabs */}
        <div className="mx-auto mb-6 flex max-w-lg justify-center gap-2 flex-wrap">
          {INDUSTRIES.map((industry, i) => (
            <button
              key={industry.id}
              onClick={() => switchIndustry(i)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                activeIndustry === i
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <industry.icon size={14} />
              {industry.label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-md">
          {/* Chat window */}
          <div className="glass-card overflow-hidden rounded-xl shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot size={18} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">{currentIndustry.businessName}</p>
                <p className="text-xs text-primary-foreground/70">Online · Powered by MANTRA AI</p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex h-[420px] flex-col gap-2 overflow-y-auto bg-muted/30 p-4"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
            >
              {messages.slice(0, visibleCount).map((msg, i) => (
                <div
                  key={`${activeIndustry}-${i}`}
                  className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                      msg.sender === "customer"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-card text-card-foreground border border-border"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="rounded-lg rounded-bl-sm bg-card text-card-foreground border border-border px-4 py-3 shadow-sm">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col items-center gap-3">
            {!isRunning && visibleCount >= messages.length && (
              <Button variant="outline" size="sm" onClick={restart} className="gap-2">
                <RefreshCw size={14} />
                Putar Ulang
              </Button>
            )}
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Bot size={14} />
              Semua dijawab otomatis: closing, booking, sampai pembayaran
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatDemo;
