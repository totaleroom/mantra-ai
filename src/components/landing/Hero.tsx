import { ArrowRight, Bot, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="max-w-xl">
            <div className="mb-6 inline-block rounded-full border border-border bg-card px-4 py-1.5">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Asisten Digital untuk Usaha Anda
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Bukan Cuma Balas Chat.{" "}
              <span className="text-primary">MANTRA Bisa Closing Penjualan.</span>
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              AI yang beneran bisa eksekusi — closing, booking, cek ongkir, terima pembayaran. 
              Kualitas setara sales terbaik, kerja 24/7 tanpa libur.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 text-base" asChild>
                <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                  Konsultasi Gratis 15 Menit
                  <ArrowRight size={18} />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <a href="#solusi">Pelajari Selengkapnya</a>
              </Button>
            </div>
          </div>

          {/* Right — Dashboard Mock */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">MANTRA.RUANG-KENDALI</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Before */}
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
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
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
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
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">87%</p>
                  <p className="text-xs text-muted-foreground">Chat Otomatis</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">3.2 jam</p>
                  <p className="text-xs text-muted-foreground">Dihemat/Hari</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">↑ 42%</p>
                  <p className="text-xs text-muted-foreground">Konversi</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Clock, value: "3-4 jam", label: "Waktu dihemat per hari" },
            { icon: TrendingUp, value: "300%", label: "Peningkatan profit" },
            { icon: Bot, value: "30+", label: "UMKM terlayani" },
            { icon: ArrowRight, value: "<3 dtk", label: "Waktu respons chat" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-foreground">{stat.value}</p>
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
