import { Zap, Eye, Handshake, Users, Clock, Bot, RefreshCw } from "lucide-react";

const values = [
  { icon: Zap, title: "Speed Over Perfection", desc: "Kami prioritaskan kecepatan eksekusi untuk bisnis Anda." },
  { icon: Eye, title: "Transparansi Total", desc: "Tidak ada biaya tersembunyi, semua jelas dari awal." },
  { icon: Handshake, title: "Partner, Bukan Vendor", desc: "Kami tumbuh bersama bisnis Anda, bukan sekadar jual putus." },
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
            Dibangun untuk UMKM Indonesia
          </h2>
          <p className="text-muted-foreground">
            MANTRA lahir dari frustrasi melihat pelaku usaha kecil kewalahan mengurus operasional sehari-hari. 
            Kami percaya teknologi AI seharusnya bisa diakses semua orang — bukan cuma perusahaan besar.
          </p>
        </div>

        {/* Values */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <v.icon size={24} className="text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
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
