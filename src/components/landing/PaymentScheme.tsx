import { CreditCard, Wallet, Building } from "lucide-react";

const PaymentScheme = () => {
  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Skema Pembayaran
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Pembayaran Mudah & Fleksibel
          </h2>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Steps */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { step: "1", title: "Deposit 50%", desc: "Bayar 50% biaya setup untuk mulai proses development." },
              { step: "2", title: "Pelunasan 50%", desc: "Lunasi sisa 50% setelah sistem selesai dan disetujui." },
              { step: "3", title: "Biaya Bulanan", desc: "Langganan bulanan dimulai setelah go-live." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border bg-background p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-mono text-lg font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mb-1 font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="mt-8 rounded-xl border border-border bg-background p-6">
            <h3 className="mb-4 text-center text-sm font-semibold text-foreground">Metode Pembayaran</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: Building, label: "Bank Transfer" },
                { icon: Wallet, label: "E-Wallet" },
                { icon: CreditCard, label: "Virtual Account" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <m.icon size={18} className="text-primary" />
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentScheme;
