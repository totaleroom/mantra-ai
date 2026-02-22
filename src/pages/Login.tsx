import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
          M
        </div>
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
