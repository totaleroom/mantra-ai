import { MessageCircle, Settings, Rocket } from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    step: "01",
    title: "Konsultasi Gratis",
    time: "15 menit",
    bullets: [
      "Ceritakan kebutuhan bisnis Anda",
      "Kami analisa proses yang bisa diotomasi",
      "Rekomendasi solusi yang paling cocok",
    ],
  },
  {
    icon: Settings,
    step: "02",
    title: "Setup & Training",
    time: "1 sampai 2 minggu",
    bullets: [
      "Tim kami setup semua integrasi",
      "Training AI dengan data bisnis Anda",
      "Testing menyeluruh sebelum go-live",
    ],
  },
  {
    icon: Rocket,
    step: "03",
    title: "Go Live & Support",
    time: "Ongoing",
    bullets: [
      "Bot mulai bekerja otomatis",
      "Monitoring performa real-time",
      "Support prioritas via WhatsApp",
    ],
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Kami yang Setup.{" "}
            <span className="gradient-text">Anda Tinggal Pakai.</span>
          </h2>
          <p className="text-muted-foreground">
            Tanpa ribet prompting. Tim kami setup dari nol sampai siap jalan. Anda cukup gunakan.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div className="pointer-events-none absolute left-0 right-0 top-14 hidden h-0.5 bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((s) => (
            <div key={s.step} className="glass-card relative rounded-xl p-6 transition-all hover:shadow-lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <s.icon size={24} className="text-primary" />
                </div>
                <span className="text-3xl font-extrabold text-border">{s.step}</span>
              </div>
              <h3 className="mb-1 text-lg font-bold text-foreground">{s.title}</h3>
              <span className="mb-4 inline-block rounded-md bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                {s.time}
              </span>
              <ul className="mt-3 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
