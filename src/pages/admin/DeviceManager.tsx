import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Wifi, WifiOff, RotateCcw, LogOut as LogOutIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "react-qr-code";

interface Client { id: string; name: string; }
interface WaSession { id: string; client_id: string; status: string; qr_code: string | null; }

export default function DeviceManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [session, setSession] = useState<WaSession | null>(null);
  const [loading, setLoading] = useState(false);
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

  const handleRestart = async () => {
    if (!session) return;
    const { error } = await supabase
      .from("wa_sessions" as any)
      .update({ status: "disconnected", qr_code: null } as any)
      .eq("id", session.id);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else toast({ title: "Session di-restart, menunggu QR baru..." });
  };

  const handleLogout = async () => {
    if (!session) return;
    const { error } = await supabase.from("wa_sessions" as any).delete().eq("id", session.id);
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else { setSession(null); toast({ title: "Session dihapus" }); }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Device & Connection</h1>

      <div className="mb-6 max-w-sm">
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
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            {session?.status === "connected" ? (
              <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30">
                <Wifi className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge className="gap-1 bg-red-500/20 text-red-700 border-red-500/30">
                <WifiOff className="h-3 w-3" /> Disconnected
              </Badge>
            )}
          </div>

          {/* QR Code Area */}
          {session?.status !== "connected" && (
            <div className="rounded-lg border border-border bg-card p-8 text-center max-w-sm">
              {session?.qr_code ? (
                <>
                  <div className="mx-auto mb-4 inline-block rounded-lg bg-white p-4">
                    <QRCode value={session.qr_code} size={220} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scan QR code ini dengan WhatsApp di HP klien.
                  </p>
                </>
              ) : (
                <div className="py-8">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Menunggu QR code dari server...</p>
                </div>
              )}
            </div>
          )}

          {session?.status === "connected" && (
            <div className="rounded-lg border border-green-500/30 bg-green-50 p-6 text-center max-w-sm dark:bg-green-500/10">
              <Wifi className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <p className="font-medium text-green-700 dark:text-green-400">Device terhubung!</p>
            </div>
          )}

          {/* Actions */}
          {session && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Restart Session
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
                <LogOutIcon className="h-4 w-4" /> Logout
              </Button>
            </div>
          )}

          {!session && (
            <p className="text-sm text-muted-foreground">
              Belum ada session untuk client ini. Session akan dibuat otomatis oleh server.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
