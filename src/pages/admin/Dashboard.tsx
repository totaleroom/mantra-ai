import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle, XCircle, Users, MessageSquare,
  Activity, UserCheck, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAttentionItems, useSystemHealth, useClients,
  useMessageStats, useActiveConversations, useHumanEscalationCount,
} from "@/hooks/useAdminData";

export default function Dashboard() {
  const { data: attention = [], isLoading: loadingAttention } = useAttentionItems();
  const { data: healthData, isLoading: loadingHealth } = useSystemHealth();
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const { data: messagesToday = 0 } = useMessageStats();
  const { data: activeConvos = [] } = useActiveConversations();
  const { data: pendingEscalations = 0 } = useHumanEscalationCount();

  const activeClients = (clientsData || []).filter((c: any) => c.status === "active").length;

  const health = healthData
    ? [
        {
          label: "WhatsApp Sessions",
          ok: healthData.waSessions.total > 0 && healthData.waSessions.connected > 0,
          detail: `${healthData.waSessions.connected}/${healthData.waSessions.total} connected`,
        },
        {
          label: "Evolution API",
          ok: healthData.evolutionConfigured,
          detail: healthData.evolutionConfigured ? "Configured" : "Not configured",
        },
      ]
    : [];

  const isLoading = loadingAttention && loadingHealth && loadingClients;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-40" />
          <Skeleton className="h-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Clients", value: activeClients, icon: Users },
    { label: "Messages Today", value: messagesToday, icon: MessageSquare },
    { label: "Active Conversations", value: activeConvos.length, icon: Activity },
    { label: "Pending Escalations", value: pendingEscalations, icon: UserCheck, highlight: pendingEscalations > 0 },
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
