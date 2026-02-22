import { Shield, Brain, Database, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    name: "PENJAGA",
    title: "AI Customer Service",
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10",
    description: "Balas chat pelanggan otomatis 24/7 di WhatsApp dan Instagram.",
    bullets: [
      "Auto-reply cerdas sesuai konteks",
      "Multi-platform: WhatsApp & Instagram",
      "Handover ke manusia jika perlu",
      "Bahasa natural, bukan robot kaku",
    ],
  },
  {
    name: "INGATAN",
    title: "Data & Stock Hub",
    icon: Database,
    color: "text-accent",
    bg: "bg-accent/10",
    description: "Pusat data terpadu — stok, pelanggan, pesanan. Semua sinkron otomatis.",
    bullets: [
      "Dashboard stok real-time",
      "CRM pelanggan terintegrasi",
      "Auto-sync antar platform",
      "Laporan otomatis harian/mingguan",
    ],
  },
];

const Features = () => {
  return (
    <section id="solusi" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Peralatan MANTRA
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            AI yang Bekerja Seperti{" "}
            <span className="text-primary">Sales Terbaik Anda</span>
          </h2>
          <p className="text-muted-foreground">
            Natural, penuh empati, dan punya insting upsell & cross-sell — bukan robot kaku.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {features.map((f) => (
            <Card key={f.name} className="group overflow-hidden transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.icon size={24} className={f.color} />
                </div>
                <div className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {f.name}
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{f.title}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{f.description}</p>
                <ul className="space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
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
