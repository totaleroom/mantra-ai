import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Wifi, WifiOff, RotateCcw, LogOut as LogOutIcon, Plus, QrCode, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";
import InstanceCard from "@/components/admin/InstanceCard";

interface Client { id: string; name: string; }
interface WaSession {
  id: string;
  client_id: string;
  status: string;
  qr_code: string | null;
  instance_name: string | null;
}

export default function DeviceManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const { toast } = useToast();

  // Fetch clients
  useEffect(() => {
    supabase.from("clients" as any).select("id, name").order("name").then(({ data }) => {
      setClients((data as any[] || []) as Client[]);
    });
  }, []);

  // Fetch sessions + realtime subscription
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
        description: `${result.synced?.length || 0} instance baru di-import, ${result.existing?.length || 0} sudah ada. Webhook terpasang.`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal sync", description: e.message });
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

        {selectedClientId && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleSync}
              disabled={actionLoading === "sync"}
            >
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
                  <DialogDescription>
                    Masukkan nama instance untuk membuat koneksi WhatsApp baru.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Nama instance (misal: mantra-bot-1)"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={!instanceName.trim() || actionLoading === "create"}
                  >
                    {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Buat & Dapatkan QR
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

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
              Belum ada instance untuk client ini. Klik "Sync dari VPS" untuk import instance yang sudah ada, atau "Buat Instance" untuk membuat baru.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
