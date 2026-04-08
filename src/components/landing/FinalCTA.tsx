import { ArrowRight, Clock, TrendingUp, Headphones, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const badges = [
  { icon: Clock, text: "Setup 1 sampai 2 minggu" },
  { icon: TrendingUp, text: "ROI dalam 1 bulan" },
  { icon: Headphones, text: "Support 24/7" },
  { icon: Gift, text: "Konsultasi gratis" },
];

const FinalCTA = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm p-8 text-center md:p-12 shadow-xl">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Kompetitor Anda Sudah Pakai AI.{" "}
            <span className="gradient-text">Anda Kapan?</span>
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Setiap menit tanpa AI, ada pelanggan yang tidak terlayani dan order yang hilang.
            Mulai sekarang, biarkan MANTRA yang closing untuk Anda.
          </p>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            {badges.map((b) => (
              <div key={b.text} className="flex items-center gap-2 rounded-lg bg-background/80 px-4 py-2 shadow-sm">
                <b.icon size={16} className="text-primary" />
                <span className="text-xs font-medium text-foreground">{b.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="premium" className="gap-2" asChild>
              <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                Jadwalkan Konsultasi Gratis
                <ArrowRight size={18} />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                Chat WhatsApp Langsung
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
