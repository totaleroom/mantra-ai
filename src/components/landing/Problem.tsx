import { MessageSquare, Package, ClipboardList, Clock } from "lucide-react";

const problems = [
  {
    icon: MessageSquare,
    old: "Chat menumpuk, banyak yang tidak terbalas",
    new: "Chat otomatis terjawab 24/7 dalam hitungan detik",
  },
  {
    icon: Package,
    old: "Stok sering salah, data tersebar di banyak tempat",
    new: "Stok terpusat & auto-sync antar platform",
  },
  {
    icon: ClipboardList,
    old: "Catat pesanan manual, sering typo & telat",
    new: "Pesanan otomatis tercatat, akurat, real-time",
  },
  {
    icon: Clock,
    old: "Habis waktu untuk operasional, tak sempat mikir strategi",
    new: "Waktu luang untuk kembangkan bisnis & keluarga",
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
            Apakah Ini yang Bapak/Ibu Rasakan?
          </h2>
          <p className="text-muted-foreground">
            Setiap hari menghadapi hal yang sama — capek, ribet, dan bisnis jalan di tempat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Cara Lama */}
          <div className="space-y-3">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Cara Lama
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
