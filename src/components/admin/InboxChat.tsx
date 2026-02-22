import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Loader2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
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
      .select("id, sender, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as any[] || []) as Message[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  // Realtime messages
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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      // Get wa_sessions instance for this conversation's client
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

  const senderStyle = (sender: string) => {
    switch (sender) {
      case "USER": return "bg-muted text-foreground";
      case "AI": return "bg-primary/10 text-primary border border-primary/20";
      case "ADMIN": return "bg-green-500/10 text-green-700 border border-green-500/20";
      default: return "bg-muted text-foreground";
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
          >
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
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  msg.sender === "USER" ? "mr-auto" : "ml-auto",
                  senderStyle(msg.sender)
                )}
              >
                <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                  {senderLabel(msg.sender)}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[10px] opacity-50 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        {handledBy === "HUMAN" ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="Ketik balasan..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
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
