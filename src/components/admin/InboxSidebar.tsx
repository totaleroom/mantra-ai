import { useState } from "react";
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
import { useClientsList, useInboxConversations } from "@/hooks/useAdminData";

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
  const [selectedClientId, setSelectedClientId] = useState("all");
  const { data: clients = [] } = useClientsList();
  const { data: conversations = [], isLoading: loading } = useInboxConversations(selectedClientId);

  // Group by client
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const grouped = new Map<string, Conversation[]>();
  for (const convo of conversations as Conversation[]) {
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
