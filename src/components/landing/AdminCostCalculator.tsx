import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Building2, TrendingDown } from "lucide-react";

const cities = [
  { name: "Jakarta", umk: 5_067_000 },
  { name: "Bandung", umk: 4_048_000 },
  { name: "Surabaya", umk: 4_725_000 },
  { name: "Semarang", umk: 3_243_000 },
  { name: "Yogyakarta", umk: 2_892_000 },
  { name: "Medan", umk: 3_580_000 },
];

const MANTRA_COST = 350_000;

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const AdminCostCalculator = () => {
  const [selectedCity, setSelectedCity] = useState(0);
  const [adminCount, setAdminCount] = useState([2]);

  const adminCost = cities[selectedCity].umk * adminCount[0];
  const savings = adminCost - MANTRA_COST;

  return (
    <section className="bg-card py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Perbandingan Biaya
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Hitung Sendiri Penghematannya
          </h2>
          <p className="text-muted-foreground">
            Bandingkan biaya admin manual vs MANTRA AI di kota Anda.
          </p>
        </div>

        {/* City Selector */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {cities.map((city, i) => (
            <button
              key={city.name}
              onClick={() => setSelectedCity(i)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCity === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Slider */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Jumlah Admin</span>
              <span className="font-mono text-lg font-bold text-primary">{adminCount[0]} orang</span>
            </div>
            <Slider value={adminCount} onValueChange={setAdminCount} min={1} max={10} step={1} />
          </div>

          {/* Comparison Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-destructive/20">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Biaya Admin Manual</span>
                </div>
                <p className="font-mono text-3xl font-bold text-foreground">{formatRp(adminCost)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {adminCount[0]} admin × UMK {cities[selectedCity].name} /bulan
                </p>
              </CardContent>
            </Card>

            <Card className="border-accent/20">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingDown size={18} className="text-accent" />
                  <span className="text-sm font-semibold text-accent">Biaya MANTRA AI</span>
                </div>
                <p className="font-mono text-3xl font-bold text-foreground">{formatRp(MANTRA_COST)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Per bulan, sudah termasuk semua fitur</p>
              </CardContent>
            </Card>
          </div>

          {/* Savings */}
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">Anda hemat hingga</p>
            <p className="mt-1 font-mono text-4xl font-extrabold text-primary">{formatRp(savings)}</p>
            <p className="mt-1 text-sm text-muted-foreground">per bulan</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminCostCalculator;
