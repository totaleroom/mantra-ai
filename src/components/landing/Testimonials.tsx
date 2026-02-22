import { Star, Users, Clock, Headphones } from "lucide-react";

const testimonials = [
  {
    name: "Ibu Ratna",
    business: "Toko Kain Batik Online",
    city: "Solo",
    initial: "R",
    quote: "Dulu saya balas chat sampai jam 12 malam. Sekarang MANTRA yang handle, saya bisa tidur nyenyak. Penjualan malah naik 40%!",
    metric: "4 jam → 30 menit",
  },
  {
    name: "Pak Hendra",
    business: "Distributor Sembako",
    city: "Surabaya",
    initial: "H",
    quote: "Stok saya dulu sering kacau antara gudang dan marketplace. Sekarang semua otomatis sinkron, gak pernah oversell lagi.",
    metric: "0 kesalahan stok",
  },
  {
    name: "Bu Dewi",
    business: "Catering & Snack Box",
    city: "Jakarta",
    initial: "D",
    quote: "Setup-nya gampang banget, tim MANTRA yang urus semua. Saya tinggal terima orderan yang sudah rapih.",
    metric: "3x lebih banyak order",
  },
  {
    name: "Mas Fikri",
    business: "Fashion Hijab",
    city: "Bandung",
    initial: "F",
    quote: "Konten marketing saya sekarang konsisten setiap hari. SUARA bantu bikin caption dan deskripsi produk yang menarik.",
    metric: "Konten 7x/minggu",
  },
];

const stats = [
  { icon: Users, value: "30+", label: "UMKM Terlayani" },
  { icon: Clock, value: "500+", label: "Jam Dihemat" },
  { icon: Star, value: "4.9", label: "Rating" },
  { icon: Headphones, value: "<24 jam", label: "Waktu Support" },
];

const Testimonials = () => {
  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Testimoni
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            30+ UMKM Sudah Buktikan
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col rounded-2xl border border-border bg-background p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.business} · {t.city}</p>
                </div>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
              <div className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-center">
                <p className="font-mono text-sm font-bold text-primary">{t.metric}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-center gap-3 rounded-xl border border-border bg-background p-4">
              <s.icon size={20} className="text-primary" />
              <div>
                <p className="font-mono text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
