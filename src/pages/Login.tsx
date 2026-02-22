import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoCircle from "@/assets/logo_mantra.png";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <img src={logoCircle} alt="Mantra AI" className="mx-auto mb-6 h-16 w-16" />
        <h1 className="mb-2 text-2xl font-extrabold text-foreground">Masuk ke MANTRA</h1>
        <p className="mb-8 text-sm text-muted-foreground">Dashboard sedang dalam pengembangan.</p>
        <Button variant="outline" className="gap-2" asChild>
          <Link to="/">
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Login;
