import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle, XCircle, Users, MessageSquare,
  Activity, UserCheck, Loader2,
} from "lucide-react";

interface AttentionItem {
  type: "client" | "escalation";
  id: string;
  label: string;
  detail: string;
  link: string;
}

interface HealthCheck {
  label: string;
  ok: boolean;
  detail: string;
}

interface Stats {
  activeClients: number;
  messagesToday: number;
  activeConversations: number;
  pendingEscalations: number;
}

export default function Dashboard() {
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [health, setHealth] = useState<HealthCheck[]>([]);
  const [stats, setStats] = useState<Stats>({ activeClients: 0, messagesToday: 0, activeConversations: 0, pendingEscalations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    await Promise.all([loadAttention(), loadHealth(), loadStats()]);
    setLoading(false);
  };

  const loadAttention = async () => {
    const items: AttentionItem[] = [];

    // Clients with issues
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

    // Human escalations
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

    setAttention(items);
  };

  const loadHealth = async () => {
    const checks: HealthCheck[] = [];

    // WA Sessions health
    const { data: sessions } = await supabase
      .from("wa_sessions" as any)
      .select("status");

    const total = (sessions as any[] || []).length;
    const connected = (sessions as any[] || []).filter((s: any) => s.status === "connected").length;
    checks.push({
      label: "WhatsApp Sessions",
      ok: total > 0 && connected > 0,
      detail: `${connected}/${total} connected`,
    });

    // Evolution API (simple check via settings existence)
    const { data: evoSetting } = await supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "evolution_api_url")
      .maybeSingle();

    checks.push({
      label: "Evolution API",
      ok: !!(evoSetting as any)?.value,
      detail: (evoSetting as any)?.value ? "Configured" : "Not configured",
    });

    setHealth(checks);
  };

  const loadStats = async () => {
    const [clientsRes, convosRes, msgRes, escalRes] = await Promise.all([
      supabase.from("clients" as any).select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("wa_conversations" as any).select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("message_logs" as any).select("message_count").eq("log_date", new Date().toISOString().split("T")[0]),
      supabase.from("wa_conversations" as any).select("id", { count: "exact", head: true }).eq("handled_by", "HUMAN").eq("status", "active"),
    ]);

    const messagesToday = ((msgRes.data as any[]) || []).reduce((sum: number, r: any) => sum + (r.message_count || 0), 0);

    setStats({
      activeClients: clientsRes.count || 0,
      messagesToday,
      activeConversations: convosRes.count || 0,
      pendingEscalations: escalRes.count || 0,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { label: "Active Clients", value: stats.activeClients, icon: Users },
    { label: "Messages Today", value: stats.messagesToday, icon: MessageSquare },
    { label: "Active Conversations", value: stats.activeConversations, icon: Activity },
    { label: "Pending Escalations", value: stats.pendingEscalations, icon: UserCheck, highlight: stats.pendingEscalations > 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Control Tower</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Needs Attention */}
        <div className="lg:col-span-2">
          <div className={`rounded-lg border p-4 ${attention.length > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Needs Attention
            </h2>
            {attention.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Semua Terkendali</span>
              </div>
            ) : (
              <div className="space-y-2">
                {attention.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {item.type === "escalation" ? (
                        <UserCheck className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">
                      {item.detail}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: System Health */}
        <div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </h2>
            <div className="space-y-3">
              {health.map((check) => (
                <div key={check.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {check.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm text-foreground">{check.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{check.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Widget 3: Global Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border p-4 ${stat.highlight ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.highlight ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className={`text-3xl font-bold ${stat.highlight ? "text-destructive" : "text-foreground"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
