import { ArrowRight, Clock, TrendingUp, Headphones, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const badges = [
  { icon: Clock, text: "Setup 1-2 minggu" },
  { icon: TrendingUp, text: "ROI dalam 1 bulan" },
  { icon: Headphones, text: "Support 24/7" },
  { icon: Gift, text: "Konsultasi gratis" },
];

const FinalCTA = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center md:p-12">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Kompetitor Anda Sudah Pakai AI.{" "}
            <span className="text-primary">Anda Kapan?</span>
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Setiap menit tanpa AI, ada pelanggan yang tidak terlayani dan order yang hilang. 
            Mulai sekarang, biarkan MANTRA yang closing untuk Anda.
          </p>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
            {badges.map((b) => (
              <div key={b.text} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                <b.icon size={16} className="text-primary" />
                <span className="text-xs font-medium text-foreground">{b.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 text-base" asChild>
              <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                Jadwalkan Konsultasi Gratis
                <ArrowRight size={18} />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base" asChild>
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
