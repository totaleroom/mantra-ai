import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import logoCircle from "@/assets/logo_mantra.png";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(128),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — bots fill hidden fields
    if (honeypot) return;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Validasi gagal",
        description: result.error.errors[0]?.message,
      });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/admin/clients");
      } else {
        await signUp(email, password);
        toast({
          title: "Registrasi berhasil",
          description: "Cek email Anda untuk verifikasi akun.",
        });
        setMode("login");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: mode === "login" ? "Login gagal" : "Registrasi gagal",
        description: err.message || "Terjadi kesalahan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <img src={logoCircle} alt="Mantra AI" className="mx-auto mb-6 h-16 w-16" />
          <h1 className="mb-2 text-2xl font-extrabold text-foreground">
            {mode === "login" ? "Masuk ke MANTRA" : "Daftar Akun MANTRA"}
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            {mode === "login" ? "Akses dashboard admin Anda" : "Buat akun baru untuk akses admin"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot — hidden from real users, bots will fill it */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="absolute -left-[9999px] opacity-0 pointer-events-none"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@mantra.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Masuk" : "Daftar"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sm text-muted-foreground"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </Button>
        </div>

        <div className="mt-2 text-center">
          <Button variant="link" size="sm" className="gap-1 text-muted-foreground" asChild>
            <Link to="/">
              <ArrowLeft size={14} />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
