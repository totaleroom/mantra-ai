import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, ArrowRightLeft, ShieldCheck, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
}

interface InboxChatProps {
  conversationId: string;
  customerName: string | null;
  customerPhone: string;
  handledBy: string;
  onHandledByChange: (newValue: string) => void;
}

export default function InboxChat({
  conversationId,
  customerName,
  customerPhone,
  handledBy,
  onHandledByChange,
}: InboxChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("wa_messages" as any)
      .select("id, sender, content, created_at, media_url, media_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as any[] || []) as Message[]);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [conversationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wa_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const { data: convo } = await supabase
        .from("wa_conversations" as any)
        .select("client_id")
        .eq("id", conversationId)
        .single();

      if (!convo) throw new Error("Conversation not found");

      const { data: session } = await supabase
        .from("wa_sessions" as any)
        .select("id")
        .eq("client_id", (convo as any).client_id)
        .eq("status", "connected")
        .maybeSingle();

      const instanceName = (session as any)?.id || "";

      const { error } = await supabase.functions.invoke("wa-send-message", {
        body: {
          instance_name: instanceName,
          phone_number: customerPhone,
          message: input.trim(),
          conversation_id: conversationId,
          sender: "ADMIN",
        },
      });

      if (error) throw error;
      setInput("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal mengirim", description: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const newValue = handledBy === "HUMAN" ? "AI" : "HUMAN";
    try {
      await supabase
        .from("wa_conversations" as any)
        .update({ handled_by: newValue } as any)
        .eq("id", conversationId);
      onHandledByChange(newValue);
      toast({ title: newValue === "AI" ? "Diserahkan ke AI" : "Diambil alih Admin" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setToggling(false);
    }
  };

  const senderLabel = (sender: string) => {
    switch (sender) {
      case "USER": return "Customer";
      case "AI": return "AI Bot";
      case "ADMIN": return "Admin";
      default: return sender;
    }
  };

  const senderBadgeClass = (sender: string) => {
    switch (sender) {
      case "USER": return "bg-muted text-muted-foreground";
      case "AI": return "bg-primary/10 text-primary";
      case "ADMIN": return "bg-green-500/10 text-green-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {customerName || customerPhone}
          </h3>
          {customerName && (
            <p className="text-xs text-muted-foreground">{customerPhone}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              handledBy === "HUMAN"
                ? "border-destructive text-destructive"
                : "border-primary text-primary"
            )}
          >
            {handledBy === "HUMAN" ? <User className="h-3 w-3 mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
            {handledBy}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleToggle} disabled={toggling}>
            {toggling ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ArrowRightLeft className="h-3 w-3 mr-1" />
            )}
            {handledBy === "HUMAN" ? "Serahkan ke AI" : "Ambil Alih"}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Belum ada pesan</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "USER";
              return (
                <div key={msg.id} className={cn("flex flex-col", isUser ? "items-start" : "items-end")}>
                  {/* Sender badge */}
                  <Badge className={cn("text-[9px] px-1.5 py-0 mb-1 font-semibold", senderBadgeClass(msg.sender))}>
                    {msg.sender === "USER" && <User className="h-2.5 w-2.5 mr-0.5" />}
                    {msg.sender === "AI" && <Bot className="h-2.5 w-2.5 mr-0.5" />}
                    {msg.sender === "ADMIN" && <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />}
                    {senderLabel(msg.sender)}
                  </Badge>
                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      isUser
                        ? "bg-muted text-foreground rounded-tl-none"
                        : msg.sender === "AI"
                          ? "bg-primary/10 text-foreground rounded-tr-none"
                          : "bg-green-500/10 text-foreground rounded-tr-none"
                    )}
                  >
                    {/* Media image */}
                    {msg.media_url && msg.media_type === "image" && (
                      <div className="mb-2">
                        <img
                          src={msg.media_url}
                          alt="Media"
                          className="max-w-full max-h-60 rounded-md object-cover cursor-pointer"
                          onClick={() => window.open(msg.media_url!, "_blank")}
                          loading="lazy"
                        />
                      </div>
                    )}
                    {/* Media placeholder for non-image */}
                    {msg.media_url && msg.media_type && msg.media_type !== "image" && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Media ({msg.media_type})</span>
                      </div>
                    )}
                    {/* Text content - hide if it's just "[Gambar]" placeholder */}
                    {msg.content && msg.content !== "[Gambar]" && (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {/* Timestamp */}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        {handledBy === "HUMAN" ? (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Ketik balasan..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="rounded-full h-9 text-sm"
            />
            <Button size="icon" className="rounded-full h-9 w-9" onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-2">
            Percakapan sedang ditangani AI. Klik "Ambil Alih" untuk membalas manual.
          </p>
        )}
      </div>
    </div>
  );
}
