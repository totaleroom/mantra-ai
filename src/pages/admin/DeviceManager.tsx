import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, RefreshCw, Server, Trash2, Activity, CheckCircle2, XCircle, AlertTriangle, Stethoscope, Wifi, WifiOff, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useClientsList, useDeviceSessions, useSettings } from "@/hooks/useAdminData";
import InstanceCard from "@/components/admin/InstanceCard";

interface VpsInstance { name: string; status: string; }
interface TestAllResult {
  overall_status: string;
  steps: { name: string; status: string; latency_ms?: number; detail: string }[];
  sessions_summary: { connected: number; connecting: number; disconnected: number; error: number };
}
interface DiagnosticsResult {
  evolution_reachable: boolean;
  provider_reachable: boolean;
  latency_ms: number;
  summary: { connected: number; connecting: number; disconnected: number; error: number; total_vps: number; total_db: number };
  instance_details: any[];
  recommendations: string[];
}

const PROVIDER_LABELS: Record<string, string> = {
  evolution: "Evolution API",
  wwebjs: "WA Bridge Lite",
  n8n: "n8n / Custom",
};

export default function DeviceManager() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [createProvider, setCreateProvider] = useState("evolution");
  const [vpsInstances, setVpsInstances] = useState<VpsInstance[] | null>(null);
  const [vpsOpen, setVpsOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [testAllResult, setTestAllResult] = useState<TestAllResult | null>(null);
  const [testAllLoading, setTestAllLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useClientsList();
  const { data: sessions = [], isLoading: loading } = useDeviceSessions(selectedClientId);
  const { data: platformSettings } = useSettings();

  const activeProvider = platformSettings?.wa_provider || "evolution";

  const invokeManage = useCallback(async (action: string, body: Record<string, any>, method = "POST") => {
    const fnName = "manage-wa-instance";
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      throw new Error("Not authenticated");
    }

    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${projectUrl}/functions/v1/${fnName}${action ? `?action=${action}` : ""}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authSession.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
    return result;
  }, []);

  const invalidateSessions = useCallback(() => {
    if (selectedClientId) {
      queryClient.invalidateQueries({ queryKey: ["deviceSessions", selectedClientId] });
    }
  }, [selectedClientId, queryClient]);

  const handleTestAll = async () => {
    setTestAllLoading(true);
    try {
      const result = await invokeManage("test-all", {});
      setTestAllResult(result);
      if (result.overall_status === "error") {
        toast({ variant: "destructive", title: "Ada masalah terdeteksi", description: "Lihat detail di panel diagnostik." });
      } else if (result.overall_status === "warn") {
        toast({ title: "Perlu perhatian", description: "Beberapa komponen perlu dicek." });
      } else {
        toast({ title: "Semua OK ✅", description: "Sistem berjalan normal." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Test gagal", description: e.message });
    } finally {
      setTestAllLoading(false);
    }
  };

  const handleDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const result = await invokeManage("diagnostics", {});
      setDiagnostics(result);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Diagnostik gagal", description: e.message });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedClientId || !instanceName.trim()) return;
    setActionLoading("create");
    try {
      await invokeManage("create", { client_id: selectedClientId, instance_name: instanceName.trim(), provider: createProvider });
      toast({ title: "Instance dibuat!", description: "Scan QR code yang muncul." });
      setCreateOpen(false);
      setInstanceName("");
      invalidateSessions();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal buat instance", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async () => {
    if (!selectedClientId) return;
    setActionLoading("sync");
    try {
      const result = await invokeManage("sync", { client_id: selectedClientId });
      toast({
        title: "Sync selesai!",
        description: `${result.synced?.length || 0} instance baru di-import, ${result.existing?.length || 0} sudah ada.`,
      });
      invalidateSessions();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal sync", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchVps = async () => {
    setActionLoading("vps-list");
    try {
      const result = await invokeManage("list", {});
      setVpsInstances(result.instances || []);
      setVpsOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal ambil daftar", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    setActionLoading("delete-all");
    setDeleteAllOpen(false);
    try {
      await invokeManage("delete-all", { client_id: selectedClientId || undefined });
      toast({ title: "Semua instance dihapus", description: "Anda bisa mulai dari awal." });
      invalidateSessions();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal hapus semua", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstanceAction = useCallback(async (action: string, instanceNameVal: string) => {
    const loadingKey = `${action}_${instanceNameVal}`;
    setActionLoading(loadingKey);
    try {
      if (action === "delete") {
        await invokeManage("", { instance_name: instanceNameVal }, "DELETE");
        toast({ title: "Instance dihapus" });
      } else if (action === "set-webhook") {
        const result = await invokeManage("set-webhook", { instance_name: instanceNameVal });
        if (result.ok) {
          toast({ title: "Webhook berhasil diperbaiki", description: `Format: ${result.format}` });
        } else {
          toast({ variant: "destructive", title: "Webhook gagal diperbaiki", description: result.error || "Unknown error" });
        }
      } else {
        await invokeManage(action, { instance_name: instanceNameVal });
        const messages: Record<string, string> = {
          connect: "QR code diperbarui",
          restart: "Session di-restart, menunggu QR baru...",
          logout: "Session logout berhasil",
        };
        toast({ title: messages[action] || "Berhasil" });
      }
      invalidateSessions();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setActionLoading(null);
    }
  }, [invokeManage, invalidateSessions, toast]);

  const getStatusIcon = (status: string) => {
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const formatTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Tidak diketahui";
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)} detik lalu`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return `${Math.floor(diff / 86400000)} hari lalu`;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Device & Connection</h1>

      {/* Test All Panel */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Test Semua Koneksi
            <Badge variant="outline" className="text-[10px] ml-2">{PROVIDER_LABELS[activeProvider] || activeProvider}</Badge>
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleDiagnostics} disabled={diagLoading}>
              {diagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Diagnostik Detail
            </Button>
            <Button size="sm" className="gap-2" onClick={handleTestAll} disabled={testAllLoading}>
              {testAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Test Sekarang
            </Button>
          </div>
        </div>

        {testAllResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-3 flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-green-700">{testAllResult.sessions_summary.connected}</p>
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/5 border-yellow-500/20">
                <CardContent className="p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-lg font-bold text-yellow-700">{testAllResult.sessions_summary.connecting}</p>
                    <p className="text-xs text-muted-foreground">Connecting</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border">
                <CardContent className="p-3 flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold text-muted-foreground">{testAllResult.sessions_summary.disconnected}</p>
                    <p className="text-xs text-muted-foreground">Disconnected</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-destructive/5 border-destructive/20">
                <CardContent className="p-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-lg font-bold text-destructive">{testAllResult.sessions_summary.error}</p>
                    <p className="text-xs text-muted-foreground">Error</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-1">
              {testAllResult.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm rounded-md px-3 py-1.5 bg-muted/30">
                  {getStatusIcon(step.status)}
                  <span className="font-medium min-w-[140px]">{step.name}</span>
                  <span className="text-muted-foreground flex-1">{step.detail}</span>
                  {step.latency_ms && <span className="text-xs text-muted-foreground">{step.latency_ms}ms</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Klik "Test Sekarang" untuk memeriksa semua komponen: provider API, webhook, database, dan heartbeat.</p>
        )}
      </div>

      {/* Diagnostics */}
      {diagnostics && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4" /> Diagnostik Detail
          </h2>

          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {(diagnostics.provider_reachable ?? diagnostics.evolution_reachable)
              ? <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle2 className="h-3 w-3" /> Provider Aktif ({diagnostics.latency_ms}ms)</Badge>
              : <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3" /> Provider Tidak Aktif</Badge>
            }
            <Badge variant="outline" className="gap-1"><Server className="h-3 w-3" /> VPS: {diagnostics.summary.total_vps} | DB: {diagnostics.summary.total_db}</Badge>
          </div>

          {diagnostics.recommendations.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 mb-3">
              {diagnostics.recommendations.map((rec, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {rec}
                </p>
              ))}
            </div>
          )}

          {diagnostics.instance_details.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Detail per Instance:</p>
              {diagnostics.instance_details.map((inst, i) => (
                <div key={i} className="rounded-md border border-border px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium">{inst.instance_name}</code>
                      {inst.provider && (
                        <Badge variant="outline" className="text-[10px]">{inst.provider?.toUpperCase()}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.in_vps && <Badge variant="outline" className="text-xs">VPS</Badge>}
                      {inst.in_db && <Badge variant="outline" className="text-xs">DB</Badge>}
                      <Badge className={`text-xs ${
                        inst.db_status === "connected" ? "bg-green-500/20 text-green-700 border-green-500/30" :
                        inst.db_status === "connecting" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" :
                        inst.db_status === "error" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>
                        {inst.db_status || inst.vps_status || "unknown"}
                      </Badge>
                    </div>
                  </div>
                  {inst.webhook && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Webhook:</span>
                      {inst.webhook.configured && inst.webhook.enabled
                        ? <span className="text-green-600">✓ Aktif</span>
                        : <span className="text-yellow-600">✗ Tidak aktif</span>
                      }
                    </div>
                  )}
                  {inst.last_webhook_event_at && (
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Event terakhir: {formatTimeAgo(inst.last_webhook_event_at)}
                    </p>
                  )}
                  {inst.last_error && (
                    <p className="text-xs text-destructive">{inst.last_error}</p>
                  )}
                  {inst.recommendations?.length > 0 && (
                    <div className="space-y-0.5">
                      {inst.recommendations.map((rec: string, j: number) => (
                        <p key={j} className="text-xs text-yellow-600 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {rec}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="max-w-sm flex-1">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" variant="outline" className="gap-2" onClick={handleFetchVps} disabled={actionLoading === "vps-list"}>
          {actionLoading === "vps-list" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
          Lihat Instance Provider
        </Button>

        <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <Button size="sm" variant="destructive" className="gap-2" onClick={() => setDeleteAllOpen(true)} disabled={!!actionLoading}>
            <Trash2 className="h-4 w-4" /> Hapus Semua
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Semua Instance?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua instance di provider dan database akan dihapus. Aksi ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Ya, Hapus Semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedClientId && (
          <>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleSync} disabled={actionLoading === "sync"}>
              {actionLoading === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync dari Provider
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Buat Instance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Instance WhatsApp</DialogTitle>
                  <DialogDescription>Masukkan nama instance dan pilih provider.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nama Instance</Label>
                    <Input placeholder="Nama instance (misal: mantra-bot-1)" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={createProvider} onValueChange={setCreateProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="evolution">Evolution API</SelectItem>
                        <SelectItem value="wwebjs">WA Bridge Lite (WWeb.js)</SelectItem>
                        <SelectItem value="n8n">Custom / n8n</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={!instanceName.trim() || actionLoading === "create"}>
                    {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Buat & Dapatkan QR
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* VPS Instance List Dialog */}
      <Dialog open={vpsOpen} onOpenChange={setVpsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instance di Provider</DialogTitle>
            <DialogDescription>Daftar semua instance yang ada di {PROVIDER_LABELS[activeProvider] || "provider"} server.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {vpsInstances && vpsInstances.length > 0 ? (
              vpsInstances.map((inst, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <code className="text-sm">{inst.name}</code>
                  <span className={`text-xs font-medium ${inst.status === "connected" ? "text-green-600" : "text-yellow-600"}`}>
                    {inst.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada instance di provider.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!selectedClientId && (
        <p className="text-muted-foreground">Pilih client untuk melihat status WhatsApp device.</p>
      )}

      {selectedClientId && loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {selectedClientId && !loading && (
        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session: any) => (
              <InstanceCard
                key={session.id}
                session={session}
                actionLoading={actionLoading}
                onAction={handleInstanceAction}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada instance untuk client ini. Klik "Sync dari Provider" untuk import, atau "Buat Instance" untuk membuat baru.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
