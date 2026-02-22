const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              M
            </div>
            <span className="font-bold text-foreground">MANTRA</span>
          </div>
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
