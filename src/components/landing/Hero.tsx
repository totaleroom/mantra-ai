import { ArrowRight, Bot, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-0 -left-32 h-80 w-80 rounded-full bg-accent/5 blur-3xl animate-float-delayed" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="max-w-xl">
            <p className="mb-6 inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Asisten Digital untuk Usaha Anda
            </p>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Bukan Cuma Balas Chat.{" "}
              <span className="gradient-text">MANTRA Bisa Closing Penjualan.</span>
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              AI yang beneran bisa eksekusi: closing, booking, cek ongkir, terima pembayaran.
              Kualitas setara sales terbaik, kerja 24/7 tanpa libur.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="premium" className="gap-2" asChild>
                <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                  Konsultasi Gratis 15 Menit
                  <ArrowRight size={18} />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#solusi">Pelajari Selengkapnya</a>
              </Button>
            </div>
          </div>

          {/* Right — Dashboard Mock */}
          <div className="relative">
            <div className="glass-card rounded-xl p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
                <span className="ml-2 text-xs font-medium text-muted-foreground">Pusat Kontrol</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Before */}
                <div className="rounded-lg bg-destructive/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-destructive">Sebelum MANTRA</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span> Chat menumpuk 200+/hari
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span> Stok sering salah hitung
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span> Order manual, sering typo
                    </li>
                  </ul>
                </div>

                {/* After */}
                <div className="rounded-lg bg-accent/5 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-accent">Sesudah MANTRA</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span> 87% chat dijawab otomatis
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span> Stok real-time & akurat
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent">✓</span> Order otomatis, 0 error
                    </li>
                  </ul>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { val: "87%", label: "Chat Otomatis" },
                  { val: "3.2 jam", label: "Dihemat/Hari" },
                  { val: "↑ 42%", label: "Konversi" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-gradient-to-br from-secondary to-secondary/50 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{s.val}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Clock, value: "3+ jam", label: "Waktu dihemat per hari" },
            { icon: TrendingUp, value: "300%", label: "Peningkatan profit" },
            { icon: Bot, value: "30+", label: "UMKM terlayani" },
            { icon: ArrowRight, value: "<3 dtk", label: "Waktu respons chat" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card flex items-center gap-3 rounded-xl p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <stat.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
