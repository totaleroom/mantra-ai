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

function IndustrialBar({ label, value, max, displayValue }: { label: string; value: number; max: number; displayValue: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-sm font-mono font-bold text-foreground">{displayValue}</span>
      </div>
      <div className="h-8 border border-foreground/20 p-0.5">
        <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
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

  // Quota usage calculation
  const totalQuotaLimit = clients.reduce((s: number, c: any) => s + (c.quota_limit || 0), 0);
  const totalQuotaRemaining = clients.reduce((s: number, c: any) => s + (c.quota_remaining || 0), 0);
  const quotaUsed = totalQuotaLimit - totalQuotaRemaining;
  const quotaPct = totalQuotaLimit > 0 ? Math.round((quotaUsed / totalQuotaLimit) * 100) : 0;

  // Throughput: messages today vs highest daily limit
  const maxDailyLimit = clients.reduce((m: number, c: any) => Math.max(m, c.daily_message_limit || 0), 0);
  const throughputPct = maxDailyLimit > 0 ? Math.min(100, Math.round((messagesToday / maxDailyLimit) * 100)) : 0;

  // Session uptime
  const waTotal = healthData?.waSessions.total || 0;
  const waConnected = healthData?.waSessions.connected || 0;
  const sessionPct = waTotal > 0 ? Math.round((waConnected / waTotal) * 100) : 0;

  const isLoading = loadingAttention && loadingHealth && loadingClients;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="dashboard-grid">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
        <div className="dashboard-grid">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Find critical resources
  const criticalResources: string[] = [];
  if (quotaPct > 80) criticalResources.push("Quota pool mendekati batas");
  if (waTotal > 0 && waConnected === 0) criticalResources.push("Tidak ada WA session yang terhubung");
  if (!healthData?.evolutionConfigured) criticalResources.push("Evolution API belum dikonfigurasi");

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground">CONTROL TOWER</h1>
        <p className="text-muted-foreground uppercase tracking-widest text-xs mt-1">V2.4.0 / MANTRA AI MANAGEMENT INTERFACE</p>
      </header>

      {/* Row 1: Metric Cards */}
      <div className="dashboard-grid">
        {/* Active Clients */}
        <div className="bg-card border border-foreground/20 p-8 shadow-soft group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Clients</p>
            <Users className="h-5 w-5 text-foreground/20" />
          </div>
          <div className="dot-matrix-text text-7xl lg:text-8xl font-bold leading-none mb-4 text-foreground">
            {String(activeClients).padStart(2, "0")}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span className="text-xs font-bold uppercase tracking-tighter">{clients.length} TOTAL REGISTERED</span>
          </div>
        </div>

        {/* Messages Today */}
        <div className="bg-card border border-foreground/20 p-8 shadow-soft group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Messages Today</p>
            <MessageSquare className="h-5 w-5 text-foreground/20" />
          </div>
          <div className="dot-matrix-text text-7xl lg:text-8xl font-bold leading-none mb-4 text-foreground">
            {messagesToday >= 1000 ? `${(messagesToday / 1000).toFixed(1)}K` : messagesToday}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-3 w-3" />
            <span className="text-xs font-bold italic tracking-tighter">TOKEN BURN: {tokenUsage >= 1000 ? `${(tokenUsage / 1000).toFixed(1)}K` : tokenUsage}</span>
          </div>
        </div>

        {/* Quota Usage */}
        <div className="bg-card border border-foreground/20 p-8 shadow-soft group hover:-translate-y-0.5 transition-transform">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quota Usage</p>
            <Gauge className="h-5 w-5 text-foreground/20" />
          </div>
          <div className="dot-matrix-text text-7xl lg:text-8xl font-bold leading-none mb-4 text-foreground">
            {quotaPct}%
          </div>
          <div className="h-1 bg-muted mt-2 overflow-hidden">
            <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${quotaPct}%` }} />
          </div>
        </div>
      </div>

      {/* Row 2: Needs Attention + System Health */}
      <div className="dashboard-grid">
        {/* Needs Attention (2 col) */}
        <div className="lg:col-span-2 bg-card border border-foreground/20 p-8 shadow-soft">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold tracking-widest uppercase text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              NEEDS ATTENTION
            </h2>
            {attention.length > 0 && (
              <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-tighter">
                {attention.length} ITEM{attention.length > 1 ? "S" : ""}
              </Badge>
            )}
          </div>

          {attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 text-foreground/10" />
              <p className="font-mono font-bold text-sm tracking-widest">ALL SYSTEMS NOMINAL</p>
              <p className="text-xs mt-1 text-muted-foreground">No issues detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attention.map((item) => (
                <Link
                  key={item.id}
                  to={item.link}
                  className="flex items-center justify-between border border-foreground/10 bg-background px-4 py-3 text-sm hover:bg-muted/50 transition-colors group"
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
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-destructive">
                    {item.detail}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* System Health (1 col) */}
        <div className="bg-card border border-foreground/20 p-8 shadow-soft">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground mb-8">System Health</h2>
          <div className="flex flex-col gap-6">
            <IndustrialBar
              label="WA-SESSIONS"
              value={waConnected}
              max={waTotal || 1}
              displayValue={`${waConnected}/${waTotal}`}
            />
            <IndustrialBar
              label="EVO-API-GATEWAY"
              value={healthData?.evolutionConfigured ? 1 : 0}
              max={1}
              displayValue={healthData?.evolutionConfigured ? "ONLINE" : "OFFLINE"}
            />
            <IndustrialBar
              label="QUOTA-POOL"
              value={quotaUsed}
              max={totalQuotaLimit || 1}
              displayValue={`${quotaUsed}/${totalQuotaLimit}`}
            />
            <IndustrialBar
              label="KNOWLEDGE-BASE"
              value={docStats?.ready || 0}
              max={docStats?.total || 1}
              displayValue={`${docStats?.ready || 0}/${docStats?.total || 0} READY`}
            />
          </div>
          {criticalResources.length > 0 && (
            <div className="mt-8 pt-6 border-t border-foreground/10">
              <div className="flex items-start gap-3 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                <p className="text-xs italic tracking-tight leading-relaxed">
                  {criticalResources.join(". ")}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Resource Allocation + Raw System Logs */}
      <div className="dashboard-grid">
        {/* Resource Allocation (1 col) */}
        <div className="bg-card border border-foreground/20 p-8 shadow-soft">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground mb-8">Resource Allocation</h2>
          <div className="flex flex-col gap-6">
            <IndustrialBar
              label="MSG-THROUGHPUT"
              value={throughputPct}
              max={100}
              displayValue={`${throughputPct}%`}
            />
            <IndustrialBar
              label="TOKEN-BURN-RATE"
              value={tokenUsage}
              max={Math.max(tokenUsage, 10000)}
              displayValue={tokenUsage >= 1000 ? `${(tokenUsage / 1000).toFixed(1)}K` : String(tokenUsage)}
            />
            <IndustrialBar
              label="SESSION-UPTIME"
              value={sessionPct}
              max={100}
              displayValue={`${sessionPct}%`}
            />
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/10">
            <div className="flex items-start gap-3 text-muted-foreground">
              <Activity className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-xs italic tracking-tight leading-relaxed">
                {throughputPct > 80 ? "High message throughput detected. Consider scaling." : "Operational metrics within normal range."}
              </p>
            </div>
          </div>
        </div>

        {/* Raw System Logs (2 col, dark) */}
        <div className="lg:col-span-2 bg-foreground text-background p-8 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Raw System Logs</h2>
            </div>
            <div className="font-mono text-xs space-y-2 opacity-80 custom-scrollbar max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="opacity-50">&gt; [INFO] No recent activity...</p>
              ) : (
                logs.map((log, i) => (
                  <p
                    key={i}
                    className={log.level === "critical" ? "text-destructive font-bold" : log.level === "warn" ? "text-yellow-400" : ""}
                  >
                    &gt; {log.message}
                  </p>
                ))
              )}
            </div>
          </div>
          <div className="mt-8 flex justify-between items-end border-t border-background/20 pt-6">
            <p className="text-[10px] uppercase tracking-widest opacity-60">MANTRA AI / Runtime v2.4.0</p>
            <span className="text-[10px] font-mono opacity-40">{format(new Date(), "HH:mm:ss")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
