import { useState } from "react";
import { Mail, Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import logoHorizontal from "@/assets/logo_mantra_horizontal.png";

const seoKeywords = [
  "chatbot UMKM Indonesia", "otomasi WhatsApp bisnis", "asisten AI UMKM",
  "customer service otomatis", "bot WhatsApp UMKM", "auto reply WhatsApp bisnis",
  "AI untuk toko online", "chatbot Shopee Tokopedia", "asisten digital usaha kecil",
  "otomasi bisnis Indonesia", "manajemen stok otomatis", "CRM UMKM Indonesia",
  "chatbot jualan online", "bot customer service Indonesia", "AI marketing UMKM",
  "WhatsApp Business API Indonesia", "chatbot e-commerce Indonesia", "otomasi marketplace",
  "asisten virtual bisnis", "solusi digital UMKM", "platform AI Indonesia",
];

const Footer = () => {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container mx-auto px-4">
        {/* Main footer grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <a href="#" className="inline-block">
              <img src={logoHorizontal} alt="Mantra AI" className="h-7 object-contain" width={105} height={28} loading="lazy" />
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Asisten Digital AI untuk UMKM Indonesia. Otomasi WhatsApp, hemat waktu, tingkatkan konversi.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Navigasi</p>
            <div className="flex flex-col gap-2">
              <a href="#masalah" className="text-sm text-muted-foreground hover:text-foreground">Masalah</a>
              <a href="#solusi" className="text-sm text-muted-foreground hover:text-foreground">Solusi</a>
              <a href="#harga" className="text-sm text-muted-foreground hover:text-foreground">Harga</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Kontak</p>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:hello00mantra@gmail.com"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Mail size={14} />
                hello00mantra@gmail.com
              </a>
              <a
                href="https://instagram.com/hiimantra"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Instagram size={14} />
                @hiimantra
              </a>
              <a
                href="https://wa.me/6282125086328"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 Mantra AI. All rights reserved.</p>
          <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <DialogTrigger asChild>
              <button className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Kebijakan Privasi
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Kebijakan Privasi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p><strong className="text-foreground">Terakhir diperbarui:</strong> Februari 2026</p>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">1. Data yang Kami Kumpulkan</h3>
                  <p>Kami mengumpulkan informasi yang Anda berikan secara langsung seperti nama, email, nomor telepon, dan data bisnis yang diperlukan untuk menyediakan layanan MANTRA AI.</p>
                </div>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">2. Penggunaan Data</h3>
                  <p>Data Anda digunakan untuk: menyediakan dan meningkatkan layanan, mengirim informasi terkait layanan, dan menganalisis penggunaan platform untuk peningkatan kualitas.</p>
                </div>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">3. Perlindungan Data</h3>
                  <p>Kami menggunakan enkripsi standar industri (TLS/SSL) untuk melindungi data Anda. Data disimpan di server yang aman dan hanya diakses oleh personel yang berwenang.</p>
                </div>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">4. Berbagi Data</h3>
                  <p>Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga tanpa persetujuan Anda, kecuali diwajibkan oleh hukum yang berlaku di Indonesia.</p>
                </div>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">5. Hak Pengguna</h3>
                  <p>Anda berhak untuk: mengakses data pribadi Anda, meminta koreksi data yang tidak akurat, meminta penghapusan data, dan menarik persetujuan penggunaan data.</p>
                </div>

                <div>
                  <h3 className="mb-1 font-semibold text-foreground">6. Kontak</h3>
                  <p>Untuk pertanyaan terkait privasi, hubungi kami di <a href="mailto:hello00mantra@gmail.com" className="text-primary hover:underline">hello00mantra@gmail.com</a>.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* SEO Ghost Keywords — invisible to users, visible to crawlers */}
        <div aria-hidden="true" className="sr-only">
          {seoKeywords.map((kw) => (
            <span key={kw}>{kw} </span>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
