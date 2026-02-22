import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Calculator, Clock, DollarSign, TrendingUp } from "lucide-react";

const HOURLY_VALUE = 50_000; // Rp per hour estimate
const MANTRA_MONTHLY = 350_000;

const ROICalculator = () => {
  const [hoursPerDay, setHoursPerDay] = useState([4]);

  const hoursSavedMonth = hoursPerDay[0] * 26; // 26 working days
  const moneySaved = hoursSavedMonth * HOURLY_VALUE;
  const netSavings = moneySaved - MANTRA_MONTHLY;
  const roi = Math.round((netSavings / MANTRA_MONTHLY) * 100);

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Kalkulator ROI
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Hitung Return on Investment Anda
          </h2>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="mb-8 rounded-2xl border border-border bg-background p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Jam dihabiskan untuk admin per hari</span>
              <span className="font-mono text-lg font-bold text-primary">{hoursPerDay[0]} jam</span>
            </div>
            <Slider value={hoursPerDay} onValueChange={setHoursPerDay} min={1} max={12} step={1} aria-label="Jam dihabiskan untuk admin per hari" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Clock, label: "Jam dihemat/bulan", value: `${hoursSavedMonth} jam` },
              { icon: DollarSign, label: "Nilai waktu dihemat", value: formatRp(moneySaved) },
              { icon: Calculator, label: "Net savings/bulan", value: formatRp(netSavings) },
              { icon: TrendingUp, label: "ROI", value: `${roi}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background p-4 text-center">
                <item.icon size={20} className="mx-auto mb-2 text-primary" />
                <p className="font-mono text-xl font-bold text-foreground truncate">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ROICalculator;
