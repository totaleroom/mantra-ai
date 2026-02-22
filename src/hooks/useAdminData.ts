import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// ── Clients ──
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 30_000,
  });
}

// ── Human escalation count (shared between sidebar + dashboard) ──
export function useHumanEscalationCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["humanEscalationCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("wa_conversations" as any)
        .select("id", { count: "exact", head: true })
        .eq("handled_by", "HUMAN")
        .eq("status", "active");
      return count || 0;
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("rq-escalation")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["humanEscalationCount"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ── Active conversations ──
export function useActiveConversations() {
  return useQuery({
    queryKey: ["activeConversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_conversations" as any)
        .select("id, client_id, customer_id, handled_by, status, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      return (data as any[]) || [];
    },
    staleTime: 15_000,
  });
}

// ── Message stats (today) ──
export function useMessageStats() {
  return useQuery({
    queryKey: ["messageStats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("message_logs" as any)
        .select("message_count")
        .eq("log_date", today);
      const total = ((data as any[]) || []).reduce((sum: number, r: any) => sum + (r.message_count || 0), 0);
      return total as number;
    },
    staleTime: 30_000,
  });
}

// ── System health ──
export function useSystemHealth() {
  return useQuery({
    queryKey: ["systemHealth"],
    queryFn: async () => {
      const [sessionsRes, evoRes] = await Promise.all([
        supabase.from("wa_sessions" as any).select("status"),
        supabase.from("platform_settings" as any).select("value").eq("key", "evolution_api_url").maybeSingle(),
      ]);
      const sessions = (sessionsRes.data as any[]) || [];
      const total = sessions.length;
      const connected = sessions.filter((s: any) => s.status === "connected").length;
      return {
        waSessions: { total, connected },
        evolutionConfigured: !!(evoRes.data as any)?.value,
        evolutionUrl: (evoRes.data as any)?.value || "",
      };
    },
    staleTime: 60_000,
  });
}

// ── Attention items (dashboard) ──
export function useAttentionItems() {
  return useQuery({
    queryKey: ["attentionItems"],
    queryFn: async () => {
      const items: { type: "client" | "escalation"; id: string; label: string; detail: string; link: string }[] = [];

      const { data: problemClients } = await supabase
        .from("clients" as any)
        .select("id, name, status, quota_remaining")
        .or("status.eq.inactive,quota_remaining.lte.0");

      for (const c of (problemClients as any[] || [])) {
        items.push({
          type: "client",
          id: c.id,
          label: c.name,
          detail: c.quota_remaining <= 0 ? "Kuota habis" : "Inactive",
          link: "/admin/clients",
        });
      }

      const { data: humanConvos } = await supabase
        .from("wa_conversations" as any)
        .select("id, customer_id, client_id")
        .eq("handled_by", "HUMAN")
        .eq("status", "active");

      if (humanConvos && (humanConvos as any[]).length > 0) {
        const customerIds = [...new Set((humanConvos as any[]).map((c: any) => c.customer_id))];
        const { data: customers } = await supabase
          .from("wa_customers" as any)
          .select("id, name, phone_number")
          .in("id", customerIds);
        const custMap = new Map(((customers as any[]) || []).map((c: any) => [c.id, c]));

        for (const c of humanConvos as any[]) {
          const cust = custMap.get(c.customer_id);
          items.push({
            type: "escalation",
            id: c.id,
            label: cust?.name || cust?.phone_number || "Unknown",
            detail: "Menunggu admin",
            link: "/admin/inbox",
          });
        }
      }

      return items;
    },
    staleTime: 15_000,
  });
}

// ── WA Sessions (for Clients page) ──
export function useWaSessions() {
  return useQuery({
    queryKey: ["waSessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_sessions" as any)
        .select("client_id, status, qr_code");
      return (data as any[]) || [];
    },
    staleTime: 30_000,
  });
}

// ── Inbox conversations ──
export function useInboxConversations(clientId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inboxConversations", clientId],
    queryFn: async () => {
      let q = supabase
        .from("wa_conversations" as any)
        .select("id, client_id, customer_id, handled_by, status, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (clientId !== "all") q = q.eq("client_id", clientId);

      const { data: convos } = await q;
      if (!convos || (convos as any[]).length === 0) return [];

      const customerIds = [...new Set((convos as any[]).map((c: any) => c.customer_id))];
      const { data: customers } = await supabase
        .from("wa_customers" as any)
        .select("id, name, phone_number")
        .in("id", customerIds);

      const customerMap = new Map(((customers as any[]) || []).map((c: any) => [c.id, c]));

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

      return (convos as any[]).map((c: any) => {
        const cust = customerMap.get(c.customer_id);
        return {
          ...c,
          customer_name: cust?.name || null,
          customer_phone: cust?.phone_number || "",
          last_message: lastMsgMap.get(c.id) || null,
        };
      });
    },
    staleTime: 10_000,
  });

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel(`rq-inbox-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inboxConversations"] });
        queryClient.invalidateQueries({ queryKey: ["humanEscalationCount"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["inboxConversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, queryClient]);

  return query;
}

// ── Clients list (minimal, for dropdowns) ──
export function useClientsList() {
  return useQuery({
    queryKey: ["clientsList"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients" as any)
        .select("id, name")
        .order("name");
      return (data as any[] || []) as { id: string; name: string }[];
    },
    staleTime: 60_000,
  });
}

// ── Message logs (for Monitoring) ──
export function useMessageLogs(dateRange: string, filterClient: string) {
  return useQuery({
    queryKey: ["messageLogs", dateRange, filterClient],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(dateRange));
      let q = supabase
        .from("message_logs" as any)
        .select("*")
        .gte("log_date", since.toISOString().split("T")[0])
        .order("log_date", { ascending: true });
      if (filterClient !== "all") q = q.eq("client_id", filterClient);
      const { data } = await q;
      return (data as any[] || []) as { client_id: string; message_count: number; token_usage: number; log_date: string }[];
    },
    staleTime: 30_000,
  });
}

// ── Billing alerts (for Monitoring) ──
export function useBillingAlerts() {
  return useQuery({
    queryKey: ["billingAlerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as any[] || []) as { id: string; client_id: string; alert_type: string; message: string; is_read: boolean; created_at: string }[];
    },
    staleTime: 30_000,
  });
}

// ── Settings (edge function) ──
export function useSettings() {
  return useQuery({
    queryKey: ["platformSettings"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-settings", { method: "GET" });
      if (res.error) throw res.error;
      return (res.data?.settings || {}) as Record<string, string>;
    },
    staleTime: 60_000,
  });
}

// ── Admin users (edge function) ──
export function useAdminUsers() {
  return useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("manage-admin", { method: "GET" });
      if (res.error) throw res.error;
      return (res.data?.admins || []) as { id: string; user_id: string; email: string; created_at: string }[];
    },
    staleTime: 60_000,
  });
}

// ── Documents (for KnowledgeBase) ──
export function useDocuments(filterClientId: string, clients: { id: string; name: string }[]) {
  return useQuery({
    queryKey: ["documents", filterClientId],
    queryFn: async () => {
      let q = supabase
        .from("documents" as any)
        .select("id, file_name, status, created_at, chunk_index, role_tag, client_id")
        .eq("chunk_index", 0)
        .order("created_at", { ascending: false });
      if (filterClientId !== "all") q = q.eq("client_id", filterClientId);
      const { data } = await q;
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));
      return ((data as any[]) || []).map((d: any) => ({
        ...d,
        client_name: clientMap.get(d.client_id) || "Unknown",
      }));
    },
    staleTime: 15_000,
    enabled: clients.length > 0 || filterClientId === "all",
  });
}
