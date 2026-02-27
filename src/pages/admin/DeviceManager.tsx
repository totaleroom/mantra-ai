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
import { Loader2, Wifi, WifiOff, RotateCcw, LogOut as LogOutIcon, Plus, QrCode, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

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
  const [session, setSession] = useState<WaSession | null>(null);
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

  // Fetch session + realtime subscription
  useEffect(() => {
    if (!selectedClientId) { setSession(null); return; }

    setLoading(true);
    supabase
      .from("wa_sessions" as any)
      .select("*")
      .eq("client_id", selectedClientId)
      .maybeSingle()
      .then(({ data }) => {
        setSession(data as any);
        setLoading(false);
      });

    const channel = supabase
      .channel(`wa_session_${selectedClientId}`)
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
            setSession(null);
          } else {
            setSession(payload.new as WaSession);
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

  const handleFetchQR = async () => {
    if (!session?.instance_name) return;
    setActionLoading("connect");
    try {
      await callManageInstance("connect", { instance_name: session.instance_name });
      toast({ title: "QR code diperbarui" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal fetch QR", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async () => {
    if (!session?.instance_name) return;
    setActionLoading("restart");
    try {
      await callManageInstance("restart", { instance_name: session.instance_name });
      toast({ title: "Session di-restart, menunggu QR baru..." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    if (!session?.instance_name) return;
    setActionLoading("logout");
    try {
      await callManageInstance("logout", { instance_name: session.instance_name });
      toast({ title: "Session logout berhasil" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!session?.instance_name) return;
    setActionLoading("delete");
    try {
      await callManageInstance("", { instance_name: session.instance_name }, "DELETE");
      setSession(null);
      toast({ title: "Instance dihapus" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const isQrBase64 = session?.qr_code?.startsWith("data:") || session?.qr_code?.startsWith("iVBOR");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Device & Connection</h1>

      <div className="mb-6 flex items-center gap-3">
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

        {selectedClientId && !session && !loading && (
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
        <div className="space-y-6">
          {session && (
            <>
              {/* Instance Info */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Instance:</span>
                <code className="rounded bg-muted px-2 py-1 text-sm">{session.instance_name || "N/A"}</code>
                <span className="text-sm font-medium text-muted-foreground ml-4">Status:</span>
                {session.status === "connected" ? (
                  <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30">
                    <Wifi className="h-3 w-3" /> Connected
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                    <WifiOff className="h-3 w-3" /> {session.status}
                  </Badge>
                )}
              </div>

              {/* QR Code Area */}
              {session.status !== "connected" && (
                <div className="rounded-lg border border-border bg-card p-8 text-center max-w-sm">
                  {session.qr_code ? (
                    <>
                      <div className="mx-auto mb-4 inline-block rounded-lg bg-white p-4">
                        {isQrBase64 ? (
                          <img
                            src={session.qr_code.startsWith("data:") ? session.qr_code : `data:image/png;base64,${session.qr_code}`}
                            alt="QR Code"
                            className="h-[220px] w-[220px]"
                          />
                        ) : (
                          <QRCode value={session.qr_code} size={220} />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scan QR code ini dengan WhatsApp di HP klien.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={handleFetchQR}
                        disabled={actionLoading === "connect"}
                      >
                        {actionLoading === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                        Refresh QR
                      </Button>
                    </>
                  ) : (
                    <div className="py-8">
                      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Menunggu QR code...</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={handleFetchQR}
                        disabled={actionLoading === "connect"}
                      >
                        {actionLoading === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                        Fetch QR
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {session.status === "connected" && (
                <div className="rounded-lg border border-green-500/30 bg-green-50 p-6 text-center max-w-sm dark:bg-green-500/10">
                  <Wifi className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="font-medium text-green-700 dark:text-green-400">Device terhubung!</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleRestart} disabled={!!actionLoading} className="gap-2">
                  {actionLoading === "restart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Restart
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} disabled={!!actionLoading} className="gap-2">
                  {actionLoading === "logout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />}
                  Logout
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!!actionLoading} className="gap-2">
                  {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Hapus Instance
                </Button>
              </div>
            </>
          )}

          {!session && (
            <p className="text-sm text-muted-foreground">
              Belum ada instance untuk client ini. Klik "Buat Instance" untuk membuat koneksi WhatsApp baru.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
