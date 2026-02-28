import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Server, Trash2, Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InstanceCard from "@/components/admin/InstanceCard";

interface Client { id: string; name: string; }
interface WaSession {
  id: string;
  client_id: string;
  status: string;
  qr_code: string | null;
  instance_name: string | null;
  last_error?: string | null;
}
interface VpsInstance { name: string; status: string; }
interface HealthCheckResult {
  evolution_reachable: boolean;
  instances: VpsInstance[];
  webhook_status: Record<string, { configured: boolean; url?: string; enabled?: boolean; error?: string }>;
  errors: string[];
}

export default function DeviceManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [vpsInstances, setVpsInstances] = useState<VpsInstance[] | null>(null);
  const [vpsOpen, setVpsOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("clients" as any).select("id, name").order("name").then(({ data }) => {
      setClients((data as any[] || []) as Client[]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setSessions([]); return; }

    setLoading(true);
    supabase
      .from("wa_sessions" as any)
      .select("*")
      .eq("client_id", selectedClientId)
      .then(({ data }) => {
        setSessions((data as any[] || []) as WaSession[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`wa_sessions_${selectedClientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_sessions",
          filter: `client_id=eq.${selectedClientId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setSessions(prev => prev.filter(s => s.id !== (payload.old as any).id));
          } else if (payload.eventType === "INSERT") {
            setSessions(prev => [...prev, payload.new as WaSession]);
          } else {
            setSessions(prev => prev.map(s => s.id === (payload.new as any).id ? payload.new as WaSession : s));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedClientId]);

  const callManageInstance = async (action: string, body: Record<string, any>, method = "POST") => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated" });
      return null;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/manage-wa-instance`;
    const url = action ? `${baseUrl}?action=${action}` : baseUrl;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authSession.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const handleHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const result = await callManageInstance("health-check", {});
      setHealthCheck(result);
      if (!result.evolution_reachable) {
        toast({ variant: "destructive", title: "Evolution API tidak bisa dijangkau", description: "Periksa VPS dan service Evolution." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Health check gagal", description: e.message });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedClientId || !instanceName.trim()) return;
    setActionLoading("create");
    try {
      await callManageInstance("create", {
        client_id: selectedClientId,
        instance_name: instanceName.trim(),
      });
      toast({ title: "Instance dibuat!", description: "Scan QR code yang muncul." });
      setCreateOpen(false);
      setInstanceName("");
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
      const result = await callManageInstance("sync", { client_id: selectedClientId });
      toast({
        title: "Sync selesai!",
        description: `${result.synced?.length || 0} instance baru di-import, ${result.existing?.length || 0} sudah ada.`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal sync", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchVps = async () => {
    setActionLoading("vps-list");
    try {
      const result = await callManageInstance("list", {});
      setVpsInstances(result.instances || []);
      setVpsOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal ambil daftar VPS", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    setActionLoading("delete-all");
    setDeleteAllOpen(false);
    try {
      await callManageInstance("delete-all", { client_id: selectedClientId || undefined });
      toast({ title: "Semua instance dihapus", description: "Anda bisa mulai dari awal." });
      setSessions([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal hapus semua", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstanceAction = async (action: string, instanceNameVal: string) => {
    const loadingKey = `${action}_${instanceNameVal}`;
    setActionLoading(loadingKey);
    try {
      if (action === "delete") {
        await callManageInstance("", { instance_name: instanceNameVal }, "DELETE");
        toast({ title: "Instance dihapus" });
      } else if (action === "set-webhook") {
        const result = await callManageInstance("set-webhook", { instance_name: instanceNameVal });
        if (result.ok) {
          toast({ title: "Webhook berhasil diperbaiki", description: `Format: ${result.format}` });
        } else {
          toast({ variant: "destructive", title: "Webhook gagal diperbaiki", description: result.error || "Unknown error" });
        }
      } else {
        await callManageInstance(action, { instance_name: instanceNameVal });
        const messages: Record<string, string> = {
          connect: "QR code diperbarui",
          restart: "Session di-restart, menunggu QR baru...",
          logout: "Session logout berhasil",
        };
        toast({ title: messages[action] || "Berhasil" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Device & Connection</h1>

      {/* Health Check Panel */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" /> Kesehatan Integrasi
          </h2>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleHealthCheck} disabled={healthLoading}>
            {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Cek Sekarang
          </Button>
        </div>
        {healthCheck ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {healthCheck.evolution_reachable
                ? <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle2 className="h-3 w-3" /> Evolution API Aktif</Badge>
                : <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3" /> Evolution API Tidak Aktif</Badge>
              }
              <Badge variant="outline" className="gap-1">
                <Server className="h-3 w-3" /> {healthCheck.instances.length} instance
              </Badge>
            </div>
            {healthCheck.errors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                {healthCheck.errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {err}
                  </p>
                ))}
              </div>
            )}
            {Object.entries(healthCheck.webhook_status).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Webhook Status:</p>
                {Object.entries(healthCheck.webhook_status).map(([name, wh]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <code className="text-xs">{name}</code>
                    {wh.configured && wh.enabled
                      ? <Badge className="gap-1 text-xs bg-green-500/20 text-green-700 border-green-500/30"><CheckCircle2 className="h-2.5 w-2.5" /> OK</Badge>
                      : <Badge className="gap-1 text-xs bg-yellow-500/20 text-yellow-700 border-yellow-500/30"><AlertTriangle className="h-2.5 w-2.5" /> {wh.error || "Not configured"}</Badge>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Klik "Cek Sekarang" untuk memeriksa koneksi Evolution API dan webhook.</p>
        )}
      </div>

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
          Lihat Instance VPS
        </Button>

        <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <Button size="sm" variant="destructive" className="gap-2" onClick={() => setDeleteAllOpen(true)} disabled={!!actionLoading}>
            <Trash2 className="h-4 w-4" /> Hapus Semua
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Semua Instance?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua instance di VPS dan database akan dihapus. Anda harus membuat instance baru setelah ini. Aksi ini tidak bisa dibatalkan.
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
              Sync dari VPS
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
                  <DialogDescription>Masukkan nama instance untuk membuat koneksi WhatsApp baru.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input placeholder="Nama instance (misal: mantra-bot-1)" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
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
            <DialogTitle>Instance di VPS</DialogTitle>
            <DialogDescription>Daftar semua instance yang ada di Evolution API server.</DialogDescription>
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
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada instance di VPS.</p>
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
            sessions.map((session) => (
              <InstanceCard
                key={session.id}
                session={session}
                actionLoading={actionLoading}
                onAction={handleInstanceAction}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada instance untuk client ini. Klik "Sync dari VPS" untuk import, atau "Buat Instance" untuk membuat baru.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
