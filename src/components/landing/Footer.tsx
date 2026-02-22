import logoHorizontal from "@/assets/logo_mantra_horizontal.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <a href="#" className="flex items-center">
            <img src={logoHorizontal} alt="Mantra AI" className="h-7" width={105} height={28} loading="lazy" />
          </a>
          <div className="flex gap-6">
            <a href="#masalah" className="text-sm text-muted-foreground hover:text-foreground">Masalah</a>
            <a href="#solusi" className="text-sm text-muted-foreground hover:text-foreground">Solusi</a>
            <a href="#harga" className="text-sm text-muted-foreground hover:text-foreground">Harga</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Mantra AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
