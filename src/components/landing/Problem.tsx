import { Frown, BookX, Clock, GraduationCap } from "lucide-react";

const problems = [
  {
    icon: Frown,
    old: "Mood karyawan berubah-ubah, kadang ketus ke pelanggan",
    new: "Selalu ramah & sabar, bahkan saat pelanggan marah",
  },
  {
    icon: BookX,
    old: "Sering lupa SOP, jawaban tidak konsisten",
    new: "100% patuh SOP, jawaban selalu sesuai arahan owner",
  },
  {
    icon: Clock,
    old: "Hanya bisa kerja 8 jam, libur di hari besar",
    new: "Online 24/7, tidak kenal libur atau jam istirahat",
  },
  {
    icon: GraduationCap,
    old: "Butuh training berulang setiap ada produk/promo baru",
    new: "Update knowledge base sekali, langsung paham semua",
  },
];

const Problem = () => {
  return (
    <section id="masalah" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Masalah
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            CS Manusia Punya Batas.{" "}
            <span className="text-primary">MANTRA Tidak.</span>
          </h2>
          <p className="text-muted-foreground">
            Karyawan bisa capek, bad mood, lupa SOP. MANTRA selalu ramah, patuh, dan tahu cara menangani pelanggan yang marah sekalipun.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* CS Manusia */}
          <div className="space-y-3">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              CS Manusia
            </h3>
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-destructive/10 bg-destructive/5 p-4">
                <p.icon size={20} className="mt-0.5 shrink-0 text-destructive/70" />
                <p className="text-sm text-foreground/80">{p.old}</p>
              </div>
            ))}
          </div>

          {/* Cara MANTRA */}
          <div className="space-y-3">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Cara MANTRA
            </h3>
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-accent/10 bg-accent/5 p-4">
                <p.icon size={20} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-sm text-foreground/80">{p.new}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Problem;
