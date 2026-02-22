import { Zap, Eye, Handshake, Clock, AlertTriangle, Package, UserX, Database, MessageSquareWarning, TrendingUp } from "lucide-react";

const painPoints = [
  { icon: Clock, title: "Kerja 14 Jam/Hari", desc: "Owner kerja dari pagi sampai malam, tapi bisnis jalan di tempat. Capek fisik, capek mental." },
  { icon: Package, title: "Stok Kacau Balau", desc: "Stok tidak sinkron antara gudang dan marketplace. Overselling terus, customer kecewa." },
  { icon: UserX, title: "Admin Resign = Chaos", desc: "Admin andalan resign, bisnis langsung berantakan. Karena semua knowledge ada di kepala dia, bukan di sistem." },
  { icon: Database, title: "Data Berserakan", desc: "Data customer ada di WA, di notes HP, di spreadsheet. Mau follow-up aja harus bongkar 5 tempat." },
  { icon: MessageSquareWarning, title: "Slow Response", desc: "Customer complain lama dibalas. Padahal tim sudah kewalahan. Chat numpuk, orderan lost." },
  { icon: TrendingUp, title: "Scaling = Headache", desc: "Mau scale bisnis berarti hire lebih banyak orang. Lebih banyak orang = lebih banyak masalah management." },
];

const values = [
  {
    icon: Zap,
    title: "Speed Over Perfection",
    desc: "Kami lebih pilih 80% automation yang jalan minggu depan, daripada 100% sempurna yang baru ready 6 bulan lagi. Bisnis Anda tidak bisa menunggu.",
  },
  {
    icon: Eye,
    title: "Transparansi Total",
    desc: "Harga yang kami quote adalah harga final. Tidak ada biaya tersembunyi, tidak ada 'oh ternyata itu fitur premium'. Semua jelas dari hari pertama.",
  },
  {
    icon: Handshake,
    title: "Partner, Bukan Vendor",
    desc: "Kami tidak jual software lalu tinggal. Kami ikut monitor, optimasi, dan grow bareng bisnis Anda. Sukses Anda = sukses kami.",
  },
];

const stats = [
  { value: "30+", label: "UMKM Terlayani" },
  { value: "15,000+", label: "Jam Dihemat" },
  { value: "<3 dtk", label: "Response Time" },
  { value: "97%", label: "Retention Rate" },
];

const About = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Tentang Kami
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Kami Paham <span className="text-primary">Sakitnya</span> Bisnis Anda
          </h2>
          <p className="text-muted-foreground">
            MANTRA lahir dari frustrasi melihat owner UMKM yang kerja mati-matian tapi tetap kewalahan.
            Kami percaya teknologi AI seharusnya jadi leverage — bukan privilege perusahaan besar.
          </p>
        </div>

        {/* Pain Points */}
        <div className="mb-16">
          <h3 className="mb-6 text-center text-lg font-bold text-foreground">
            <AlertTriangle size={18} className="mb-1 mr-2 inline text-destructive" />
            Pain yang Kami Selesaikan
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {painPoints.map((p) => (
              <div key={p.title} className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                    <p.icon size={18} className="text-destructive" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{p.title}</h4>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <v.icon size={24} className="text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="font-mono text-3xl font-extrabold text-primary">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
