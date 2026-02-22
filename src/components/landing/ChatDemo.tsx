import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Message {
  sender: "customer" | "ai";
  text: string;
}

const MESSAGES: Message[] = [
  { sender: "customer", text: "Halo kak, mau tanya dong. Ada bolu pandan ga?" },
  {
    sender: "ai",
    text: "Halo kak! Ada dong 😊 Bolu Pandan Keju kami lagi best seller. Mau ukuran yang mana kak?\n\n• Mini (15cm) — Rp45.000\n• Regular (22cm) — Rp85.000",
  },
  { sender: "customer", text: "Wah murah ya! Regular aja kak. Bisa kirim ke Cilandak ga?" },
  {
    sender: "ai",
    text: "Bisa banget kak! Ongkir ke Cilandak Rp15.000. Totalnya Rp100.000 ya 🛵\n\nMau dikirim kapan kak?",
  },
  { sender: "customer", text: "Besok siang bisa kak? Sekitar jam 12" },
  {
    sender: "ai",
    text: "Siap kak, besok siang jam 12 ya ✅\n\nRekap order:\n• Bolu Pandan Keju Regular (22cm) — Rp85.000\n• Ongkir Cilandak — Rp15.000\n• Total: Rp100.000\n\nPembayaran bisa transfer ke:\nBCA 1234567890 a.n. Dapur Bunda Ani\n\nKonfirmasi setelah transfer ya kak! 🙏",
  },
  { sender: "customer", text: "Udah transfer kak, ini buktinya 🧾" },
  {
    sender: "ai",
    text: "Terima kasih kak! Pembayaran sudah kami terima ✅\n\nPesanan sedang diproses dan akan dikirim besok jam 12. Kakak akan dapat notifikasi pas kurir berangkat ya.\n\nTerima kasih sudah order di Dapur Bunda Ani! 🎂",
  },
];

const CUSTOMER_DELAY = 1200;
const AI_TYPING_DELAY = 1500;

const ChatDemo = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isRunning, setIsRunning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isRunning || visibleCount >= MESSAGES.length) {
      if (visibleCount >= MESSAGES.length) setIsRunning(false);
      return;
    }

    const nextMsg = MESSAGES[visibleCount];
    const isAi = nextMsg.sender === "ai";

    if (isAi) {
      setIsTyping(true);
      scrollToBottom();
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setVisibleCount((c) => c + 1);
      }, AI_TYPING_DELAY);
    } else {
      timeoutRef.current = setTimeout(() => {
        setVisibleCount((c) => c + 1);
      }, CUSTOMER_DELAY);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visibleCount, isRunning, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, isTyping, scrollToBottom]);

  const restart = () => {
    setVisibleCount(0);
    setIsTyping(false);
    setIsRunning(true);
  };

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="mb-3 inline-block font-mono text-xs font-semibold uppercase tracking-widest text-primary">
            Demo Live
          </span>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Lihat MANTRA AI Beraksi
          </h2>
          <p className="text-sm text-muted-foreground italic">
            Konsumen pikir ini admin manusia… padahal ini <span className="font-bold text-primary">MANTRA AI</span> 🤖
          </p>
        </div>

        <div className="mx-auto max-w-md">
          {/* Chat window */}
          <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-3 bg-primary px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot size={18} className="text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground">Dapur Bunda Ani</p>
                <p className="text-xs text-primary-foreground/70">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex h-[420px] flex-col gap-2 overflow-y-auto bg-muted/30 p-4"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
            >
              {MESSAGES.slice(0, visibleCount).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                      msg.sender === "customer"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-card text-card-foreground border border-border"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="rounded-2xl rounded-bl-md bg-card text-card-foreground border border-border px-4 py-3 shadow-sm">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col items-center gap-3">
            {!isRunning && visibleCount >= MESSAGES.length && (
              <Button variant="outline" size="sm" onClick={restart} className="gap-2">
                <RefreshCw size={14} />
                Putar Ulang
              </Button>
            )}
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Bot size={14} />
              Semua dijawab otomatis oleh MANTRA AI dalam hitungan detik
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatDemo;
