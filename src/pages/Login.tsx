import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import logoCircle from "@/assets/logo_mantra.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/admin/clients");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login gagal",
        description: err.message || "Email atau password salah.",
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
          <h1 className="mb-2 text-2xl font-extrabold text-foreground">Masuk ke MANTRA</h1>
          <p className="mb-8 text-sm text-muted-foreground">Akses dashboard admin Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@mantra.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Masuk
          </Button>
        </form>

        <div className="mt-6 text-center">
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
