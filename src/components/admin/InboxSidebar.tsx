import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client { id: string; name: string; }
interface Conversation {
  id: string;
  client_id: string;
  customer_id: string;
  handled_by: string;
  status: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string;
  last_message: string | null;
}

interface InboxSidebarProps {
  selectedConvoId: string | null;
  onSelectConvo: (convo: Conversation) => void;
}

export default function InboxSidebar({ selectedConvoId, onSelectConvo }: InboxSidebarProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("clients" as any).select("id, name").order("name").then(({ data }) => {
      setClients((data as any[] || []) as Client[]);
    });
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    let query = supabase
      .from("wa_conversations" as any)
      .select("id, client_id, customer_id, handled_by, status, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (selectedClientId !== "all") {
      query = query.eq("client_id", selectedClientId);
    }

    const { data: convos } = await query;
    if (!convos || (convos as any[]).length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch customer info for each conversation
    const customerIds = [...new Set((convos as any[]).map((c: any) => c.customer_id))];
    const { data: customers } = await supabase
      .from("wa_customers" as any)
      .select("id, name, phone_number")
      .in("id", customerIds);

    const customerMap = new Map(
      ((customers as any[]) || []).map((c: any) => [c.id, c])
    );

    // Fetch last message for each conversation
    const convoIds = (convos as any[]).map((c: any) => c.id);
    const { data: lastMessages } = await supabase
      .from("wa_messages" as any)
      .select("conversation_id, content")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, string>();
    if (lastMessages) {
      for (const msg of lastMessages as any[]) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, msg.content);
        }
      }
    }

    const enriched: Conversation[] = (convos as any[]).map((c: any) => {
      const cust = customerMap.get(c.customer_id);
      return {
        ...c,
        customer_name: cust?.name || null,
        customer_phone: cust?.phone_number || "",
        last_message: lastMsgMap.get(c.id) || null,
      };
    });

    setConversations(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [selectedClientId]);

  // Realtime subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel("inbox-conversations")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "wa_conversations",
      }, () => {
        fetchConversations();
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wa_messages",
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedClientId]);

  const humanConvos = conversations.filter((c) => c.handled_by === "HUMAN");
  const aiConvos = conversations.filter((c) => c.handled_by === "AI");

  const ConvoItem = ({ convo }: { convo: Conversation }) => (
    <button
      onClick={() => onSelectConvo(convo)}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors hover:bg-accent",
        selectedConvoId === convo.id && "bg-accent",
        convo.handled_by === "HUMAN" && "border-l-4 border-l-destructive"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground truncate">
          {convo.customer_name || convo.customer_phone}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5",
            convo.handled_by === "HUMAN"
              ? "border-destructive text-destructive"
              : "border-primary text-primary"
          )}
        >
          {convo.handled_by === "HUMAN" ? <User className="h-3 w-3 mr-0.5" /> : <Bot className="h-3 w-3 mr-0.5" />}
          {convo.handled_by}
        </Badge>
      </div>
      {convo.customer_name && (
        <p className="text-xs text-muted-foreground">{convo.customer_phone}</p>
      )}
      {convo.last_message && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{convo.last_message}</p>
      )}
    </button>
  );

  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-2">Inbox</h2>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Semua Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Memuat...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada percakapan</p>
          ) : (
            <>
              {humanConvos.length > 0 && (
                <>
                  <p className="text-[10px] uppercase font-semibold text-destructive px-2 pt-2">
                    Butuh Admin ({humanConvos.length})
                  </p>
                  {humanConvos.map((c) => <ConvoItem key={c.id} convo={c} />)}
                </>
              )}
              {aiConvos.length > 0 && (
                <>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground px-2 pt-2">
                    Ditangani AI ({aiConvos.length})
                  </p>
                  {aiConvos.map((c) => <ConvoItem key={c.id} convo={c} />)}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
