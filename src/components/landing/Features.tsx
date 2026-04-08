import { Shield, Brain, Database, Sparkles, Zap, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    name: "PENJAGA",
    title: "AI Customer Service",
    icon: Shield,
    color: "text-primary",
    bg: "from-primary/20 to-primary/5",
    description: "Balas chat pelanggan otomatis 24/7 di WhatsApp dan Instagram.",
    bullets: [
      "Auto-reply cerdas sesuai konteks",
      "Multi-platform: WhatsApp & Instagram",
      "Handover ke manusia jika perlu",
      "Bahasa natural, bukan robot kaku",
    ],
    example: "\"Halo kak, ada ukuran 42?\" → AI cek stok, kasih opsi, closing otomatis",
  },
  {
    name: "INGATAN",
    title: "Data & Stock Hub",
    icon: Database,
    color: "text-accent",
    bg: "from-accent/20 to-accent/5",
    description: "Pusat data terpadu: stok, pelanggan, pesanan. Semua sinkron otomatis.",
    bullets: [
      "Dashboard stok real-time",
      "CRM pelanggan terintegrasi",
      "Auto-sync antar platform",
      "Laporan otomatis harian/mingguan",
    ],
    example: "Stok berubah di gudang → otomatis update di semua channel",
  },
  {
    name: "EKSEKUTOR",
    title: "Closing & Booking Engine",
    icon: Zap,
    color: "text-primary",
    bg: "from-primary/20 to-primary/5",
    description: "Bukan cuma jawab, tapi eksekusi: closing penjualan, booking jadwal, proses pembayaran.",
    bullets: [
      "Auto-closing dengan rekap order",
      "Booking & scheduling otomatis",
      "Cek ongkir & proses COD",
      "Kirim invoice & konfirmasi bayar",
    ],
    example: "Customer minta booking → AI cek slot, konfirmasi, kirim reminder",
  },
  {
    name: "ANALITIK",
    title: "Laporan & Insight",
    icon: BarChart3,
    color: "text-accent",
    bg: "from-accent/20 to-accent/5",
    description: "Pantau performa bisnis dari satu dashboard. Semua data tersaji rapi tanpa harus buka spreadsheet.",
    bullets: [
      "Laporan harian otomatis via WA",
      "Analisa produk terlaris",
      "Tracking conversion rate",
      "Alert stok menipis & anomali",
    ],
    example: "Setiap pagi terima ringkasan: 47 order, 12 pending, stok A tinggal 5",
  },
];

const Features = () => {
  return (
    <section id="solusi" className="section-gradient-bottom py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold text-primary">Peralatan MANTRA</p>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            AI yang Bekerja Seperti{" "}
            <span className="gradient-text">Sales Terbaik Anda</span>
          </h2>
          <p className="text-muted-foreground">
            Natural, penuh empati, dan punya insting upsell & cross-sell. Bukan robot kaku.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {features.map((f) => (
            <Card key={f.name} className="group overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:border-primary/20">
              <CardContent className="p-6">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${f.bg}`}>
                  <f.icon size={24} className={f.color} />
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {f.name}
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{f.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{f.description}</p>
                <ul className="mb-4 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
                {/* Mini example */}
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
                  💡 {f.example}
                </div>
                <a href="#harga" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                  Lihat Harga →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
