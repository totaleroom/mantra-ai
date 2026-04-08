import { Star, Users, Clock, Headphones } from "lucide-react";

const testimonials = [
  {
    name: "Bu Ratna Sari",
    business: "Batik Ratna Collection",
    city: "Solo",
    initial: "R",
    quote: "Dulu saya balas chat sampe jam 12 malem, kadang ketiduran belum sempet bales. Sekarang MANTRA yang handle semua, saya bisa tidur nyenyak. Yang bikin kaget, penjualan malah naik 40% karena ga ada lagi chat yang kelewat 😅",
    metric: "4 jam → 30 menit response",
    stars: 5,
  },
  {
    name: "Pak Hendra Wijaya",
    business: "CV Berkah Sembako",
    city: "Surabaya",
    initial: "H",
    quote: "Stok saya dulu sering kacau antara gudang dan marketplace, overselling terus. Customer complain, kita yang repot. Sekarang semua otomatis sinkron, udah 3 bulan ga pernah oversell lagi alhamdulillah.",
    metric: "0 kesalahan stok/bulan",
    stars: 5,
  },
  {
    name: "Bu Dewi Anggraini",
    business: "Dapur Dewi Catering",
    city: "Jakarta Selatan",
    initial: "D",
    quote: "Setup-nya gampang banget, tim MANTRA yang urus semua dari awal. Saya tinggal kasih menu sama harga, mereka yang bikin flow chat-nya. Sekarang order masuk rapi, ga perlu lagi tulis manual di buku 😄",
    metric: "3x lebih banyak order",
    stars: 5,
  },
  {
    name: "Mas Fikri Ramadhan",
    business: "Hijab by Zahra",
    city: "Bandung",
    initial: "F",
    quote: "Customer chat jam 11 malem biasanya baru dibales besok pagi, kebanyakan udah beli di tempat lain. Sekarang MANTRA langsung handle, conversion rate naik drastis soalnya fast response itu segalanya di online shop.",
    metric: "Response < 5 detik 24/7",
    stars: 5,
  },
  {
    name: "Pak Agus Santoso",
    business: "Bengkel Motor Jaya",
    city: "Bekasi",
    initial: "A",
    quote: "Awalnya skeptis, bisnis bengkel kok pake AI. Ternyata cocok banget buat booking servis sama ingetin customer ganti oli. Sekarang slot servis selalu penuh, ga perlu lagi nelponin satu-satu.",
    metric: "Booking penuh setiap hari",
    stars: 5,
  },
  {
    name: "Ibu Mega Putri",
    business: "Skincare Glow.id",
    city: "Yogyakarta",
    initial: "M",
    quote: "Yang paling saya suka, AI-nya bisa rekomendasiin produk sesuai masalah kulit customer. Kayak punya beauty advisor yang kerja 24 jam. Repeat order naik 60% sejak pake MANTRA 🥰",
    metric: "↑60% repeat order",
    stars: 5,
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
    <section className="section-gradient py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Hasil Nyata,{" "}
            <span className="gradient-text">Bukan Janji Kosong</span>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="glass-card flex flex-col rounded-xl p-5 transition-all duration-300 hover:shadow-lg">
              {/* Stars */}
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="fill-primary text-primary" />
                ))}
              </div>

              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>

              <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground text-sm">
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.business} · {t.city}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-center">
                <p className="text-sm font-bold text-primary">{t.metric}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <s.icon size={20} className="text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
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
