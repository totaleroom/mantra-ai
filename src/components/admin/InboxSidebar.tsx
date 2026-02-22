import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { User, Bot, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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

    const customerIds = [...new Set((convos as any[]).map((c: any) => c.customer_id))];
    const { data: customers } = await supabase
      .from("wa_customers" as any)
      .select("id, name, phone_number")
      .in("id", customerIds);

    const customerMap = new Map(
      ((customers as any[]) || []).map((c: any) => [c.id, c])
    );

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

  useEffect(() => { fetchConversations(); }, [selectedClientId]);

  useEffect(() => {
    const channel = supabase
      .channel("inbox-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => fetchConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_messages" }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedClientId]);

  // Group by client
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const grouped = new Map<string, Conversation[]>();
  for (const convo of conversations) {
    const clientName = clientMap.get(convo.client_id) || "Unknown";
    if (!grouped.has(clientName)) grouped.set(clientName, []);
    grouped.get(clientName)!.push(convo);
  }

  // Sort groups: those with HUMAN convos first
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const aHasHuman = a[1].some((c) => c.handled_by === "HUMAN");
    const bHasHuman = b[1].some((c) => c.handled_by === "HUMAN");
    if (aHasHuman && !bHasHuman) return -1;
    if (!aHasHuman && bHasHuman) return 1;
    return a[0].localeCompare(b[0]);
  });

  const ConvoItem = ({ convo }: { convo: Conversation }) => (
    <button
      onClick={() => onSelectConvo(convo)}
      className={cn(
        "w-full text-left p-2.5 rounded-md transition-colors",
        selectedConvoId === convo.id ? "bg-accent" : "hover:bg-accent/50",
        convo.handled_by === "HUMAN" && "bg-destructive/5 border-l-4 border-l-destructive"
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {convo.customer_name || convo.customer_phone}
        </span>
        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
          {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: false, locale: idLocale })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        {convo.handled_by === "HUMAN" ? (
          <User className="h-3 w-3 text-destructive" />
        ) : (
          <Bot className="h-3 w-3 text-primary" />
        )}
        <span className={cn(
          "text-[10px] font-semibold",
          convo.handled_by === "HUMAN" ? "text-destructive" : "text-primary"
        )}>
          {convo.handled_by}
        </span>
      </div>
      {convo.last_message && (
        <p className="text-xs text-muted-foreground truncate">{convo.last_message}</p>
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
            sortedGroups.map(([clientName, convos]) => {
              const humanCount = convos.filter((c) => c.handled_by === "HUMAN").length;
              return (
                <Collapsible key={clientName} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    <span className="flex items-center gap-1.5">
                      {clientName}
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{convos.length}</Badge>
                      {humanCount > 0 && (
                        <Badge className="bg-destructive text-destructive-foreground text-[9px] h-4 px-1">{humanCount}</Badge>
                      )}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5">
                    {convos.map((c) => <ConvoItem key={c.id} convo={c} />)}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
