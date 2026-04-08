import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle, XCircle, Users, MessageSquare,
  Activity, UserCheck, Loader2, Database, Gauge, Radio,
  Shield, BookOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAttentionItems, useSystemHealth, useClients,
  useMessageStats, useActiveConversations, useHumanEscalationCount,
  useTokenUsageToday, useDashboardLogs, useDocumentStats,
} from "@/hooks/useAdminData";
import { format } from "date-fns";

const PROVIDER_LABELS: Record<string, string> = {
  evolution: "Evolution",
  wwebjs: "WWeb.js",
  n8n: "n8n",
  custom: "Custom",
  baileys: "Baileys",
};

function MetricBar({ label, value, max, displayValue, color = "bg-primary" }: { label: string; value: number; max: number; displayValue: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground">{displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: attention = [], isLoading: loadingAttention } = useAttentionItems();
  const { data: healthData, isLoading: loadingHealth } = useSystemHealth();
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const { data: messagesToday = 0 } = useMessageStats();
  const { data: activeConvos = [] } = useActiveConversations();
  const { data: pendingEscalations = 0 } = useHumanEscalationCount();
  const { data: tokenUsage = 0 } = useTokenUsageToday();
  const { data: logs = [] } = useDashboardLogs();
  const { data: docStats } = useDocumentStats();

  const clients = clientsData || [];
  const activeClients = clients.filter((c: any) => c.status === "active").length;

  const totalQuotaLimit = clients.reduce((s: number, c: any) => s + (c.quota_limit || 0), 0);
  const totalQuotaRemaining = clients.reduce((s: number, c: any) => s + (c.quota_remaining || 0), 0);
  const quotaUsed = totalQuotaLimit - totalQuotaRemaining;
  const quotaPct = totalQuotaLimit > 0 ? Math.round((quotaUsed / totalQuotaLimit) * 100) : 0;

  const maxDailyLimit = clients.reduce((m: number, c: any) => Math.max(m, c.daily_message_limit || 0), 0);
  const throughputPct = maxDailyLimit > 0 ? Math.min(100, Math.round((messagesToday / maxDailyLimit) * 100)) : 0;

  const waTotal = healthData?.waSessions.total || 0;
  const waConnected = healthData?.waSessions.connected || 0;
  const sessionPct = waTotal > 0 ? Math.round((waConnected / waTotal) * 100) : 0;

  const activeProvider = healthData?.provider || "evolution";
  const providerLabel = PROVIDER_LABELS[activeProvider] || activeProvider;

  const sessionsByProvider = healthData?.sessionsByProvider || {};
  const providerSummaryParts = Object.entries(sessionsByProvider)
    .filter(([, v]) => v.total > 0)
    .map(([p, v]) => `${v.connected}/${v.total} ${PROVIDER_LABELS[p] || p}`);
  const providerSummary = providerSummaryParts.length > 0 ? providerSummaryParts.join(", ") : "";

  const isLoading = loadingAttention && loadingHealth && loadingClients;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const criticalResources: string[] = [];
  if (quotaPct > 80) criticalResources.push("Quota pool mendekati batas");
  if (waTotal > 0 && waConnected === 0) criticalResources.push("Tidak ada WA session yang terhubung");
  if (!healthData?.providerConfigured) criticalResources.push("WhatsApp provider belum dikonfigurasi");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-foreground">Pusat Kontrol</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          v3.0 · Provider aktif: <span className="font-medium text-foreground">{providerLabel}</span>
        </p>
      </header>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-xl p-6 transition-all hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-medium text-muted-foreground">Klien Aktif</p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-4xl font-bold text-foreground mb-1">
            {String(activeClients).padStart(2, "0")}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {clients.length} total terdaftar
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 transition-all hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-medium text-muted-foreground">Pesan Hari Ini</p>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="text-4xl font-bold text-foreground mb-1">
            {messagesToday >= 1000 ? `${(messagesToday / 1000).toFixed(1)}K` : messagesToday}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Database className="h-3 w-3" />
            Token: {tokenUsage >= 1000 ? `${(tokenUsage / 1000).toFixed(1)}K` : tokenUsage}
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 transition-all hover:shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-medium text-muted-foreground">Penggunaan Quota</p>
            <Gauge className="h-4 w-4 text-primary" />
          </div>
          <p className="text-4xl font-bold text-foreground mb-2">
            {quotaPct}%
          </p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quotaPct > 80 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Needs Attention + System Health */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 glass-card rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Perlu Perhatian
            </h2>
            {attention.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {attention.length} item
              </Badge>
            )}
          </div>

          {attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 text-accent/30" />
              <p className="font-semibold text-sm">Semua sistem normal</p>
              <p className="text-xs mt-1">Tidak ada masalah terdeteksi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attention.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    {item.type === "escalation" ? (
                      <UserCheck className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs font-medium text-destructive">
                    {item.detail}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-6">Kesehatan Sistem</h2>
          <div className="flex flex-col gap-5">
            <div>
              <MetricBar
                label="WhatsApp Sessions"
                value={waConnected}
                max={waTotal || 1}
                displayValue={`${waConnected}/${waTotal}`}
                color={waConnected > 0 ? "bg-accent" : "bg-destructive"}
              />
              {providerSummary && (
                <p className="text-[10px] text-muted-foreground mt-1">{providerSummary}</p>
              )}
            </div>
            <MetricBar
              label={`Gateway (${providerLabel})`}
              value={healthData?.providerConfigured ? 1 : 0}
              max={1}
              displayValue={healthData?.providerConfigured ? "Online" : "Offline"}
              color={healthData?.providerConfigured ? "bg-accent" : "bg-destructive"}
            />
            <MetricBar
              label="Pool Quota"
              value={quotaUsed}
              max={totalQuotaLimit || 1}
              displayValue={`${quotaUsed}/${totalQuotaLimit}`}
              color={quotaPct > 80 ? "bg-destructive" : "bg-primary"}
            />
            <MetricBar
              label="Knowledge Base"
              value={docStats?.ready || 0}
              max={docStats?.total || 1}
              displayValue={`${docStats?.ready || 0}/${docStats?.total || 0} ready`}
              color="bg-accent"
            />
          </div>
          {criticalResources.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="flex items-start gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <p className="text-xs leading-relaxed">
                  {criticalResources.join(". ")}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource + Logs */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-6">Alokasi Resource</h2>
          <div className="flex flex-col gap-5">
            <MetricBar
              label="Throughput Pesan"
              value={throughputPct}
              max={100}
              displayValue={`${throughputPct}%`}
            />
            <MetricBar
              label="Token Terpakai"
              value={tokenUsage}
              max={Math.max(tokenUsage, 10000)}
              displayValue={tokenUsage >= 1000 ? `${(tokenUsage / 1000).toFixed(1)}K` : String(tokenUsage)}
            />
            <MetricBar
              label="Uptime Session"
              value={sessionPct}
              max={100}
              displayValue={`${sessionPct}%`}
              color={sessionPct > 50 ? "bg-accent" : "bg-destructive"}
            />
          </div>
          <div className="mt-5 pt-4 border-t border-border/50">
            <div className="flex items-start gap-2 text-muted-foreground">
              <Activity className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                {throughputPct > 80 ? "Throughput pesan tinggi. Pertimbangkan untuk scaling." : "Metrik operasional dalam range normal."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 glass-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h2 className="text-sm font-semibold text-foreground">Log Sistem</h2>
          </div>
          <div className="text-xs space-y-2 custom-scrollbar max-h-48 overflow-y-auto rounded-lg bg-muted/30 p-4">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">&gt; Tidak ada aktivitas terbaru...</p>
            ) : (
              logs.map((log, i) => (
                <p
                  key={i}
                  className={`font-mono ${log.level === "critical" ? "text-destructive font-bold" : log.level === "warn" ? "text-yellow-500" : "text-muted-foreground"}`}
                >
                  &gt; {log.message}
                </p>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-between items-end pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">MANTRA AI · Runtime v3.0</p>
            <span className="text-xs text-muted-foreground font-mono">{format(new Date(), "HH:mm:ss")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
