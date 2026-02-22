import { Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    name: "STARTER",
    price: 250_000,
    setup: 2_000_000,
    target: "Cocok untuk usaha baru mulai go-digital",
    popular: false,
    features: [
      { text: "1 channel (WhatsApp saja)", included: true },
      { text: "Auto-reply dasar", included: true },
      { text: "Dashboard stok sederhana", included: true },
      { text: "Laporan mingguan", included: true },
      { text: "Multi-platform sync", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "GROWTH",
    price: 350_000,
    setup: 3_000_000,
    target: "Paling cocok untuk UMKM yang ingin scale up",
    popular: true,
    features: [
      { text: "Multi-channel (WA & Instagram)", included: true },
      { text: "Auto-reply cerdas + konteks", included: true },
      { text: "CRM & stok multi-platform", included: true },
      { text: "Laporan harian otomatis", included: true },
      { text: "Multi-platform sync", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const Pricing = () => {
  return (
    <section id="harga" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Harga
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Investasi untuk Bisnis Anda
          </h2>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${
                plan.popular ? "border-2 border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  PALING POPULER
                </div>
              )}
              <CardContent className="p-6">
                <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {plan.name}
                </h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-extrabold text-foreground">
                    {formatRp(plan.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">/bulan</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">+ Setup {formatRp(plan.setup)} (sekali bayar)</p>

                <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
                  {plan.target}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                      ) : (
                        <X size={16} className="mt-0.5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={f.included ? "text-foreground" : "text-muted-foreground/50"}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full gap-2"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <a href="https://wa.me/6282125086328" target="_blank" rel="noopener noreferrer">
                    Mulai Sekarang
                    <ArrowRight size={16} />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
