import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Wifi, WifiOff, RotateCcw, LogOut as LogOutIcon, QrCode, Trash2, AlertTriangle, ChevronDown, Wrench, RefreshCw } from "lucide-react";
import QRCode from "react-qr-code";

interface WaSession {
  id: string;
  client_id: string;
  status: string;
  qr_code: string | null;
  instance_name: string | null;
  last_error?: string | null;
}

interface InstanceCardProps {
  session: WaSession;
  actionLoading: string | null;
  onAction: (action: string, instanceName: string) => void;
}

export default function InstanceCard({ session, actionLoading, onAction }: InstanceCardProps) {
  const name = session.instance_name || "N/A";
  const isLoading = (action: string) => actionLoading === `${action}_${name}`;
  const isAnyLoading = !!actionLoading;
  const isQrBase64 = session.qr_code?.startsWith("data:") || session.qr_code?.startsWith("iVBOR");
  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-refresh QR when connecting
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_AUTO_REFRESH = 6;
  const REFRESH_INTERVAL = 10;

  useEffect(() => {
    if (session.status === "connecting" && !session.qr_code && autoRefreshCount < MAX_AUTO_REFRESH && !isAnyLoading) {
      setCountdown(REFRESH_INTERVAL);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setAutoRefreshCount(c => c + 1);
            onAction("connect", name);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.status, session.qr_code, autoRefreshCount]);

  // Reset auto-refresh when status changes from connecting
  useEffect(() => {
    if (session.status !== "connecting") {
      setAutoRefreshCount(0);
      setCountdown(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [session.status]);

  const statusBadge = () => {
    if (session.status === "connected") {
      return (
        <Badge className="gap-1 bg-green-500/20 text-green-700 border-green-500/30">
          <Wifi className="h-3 w-3" /> Connected
        </Badge>
      );
    }
    if (session.status === "connecting") {
      return (
        <Badge className="gap-1 bg-blue-500/20 text-blue-700 border-blue-500/30">
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting
        </Badge>
      );
    }
    if (session.status === "error") {
      return (
        <Badge className="gap-1 bg-destructive/20 text-destructive border-destructive/30">
          <AlertTriangle className="h-3 w-3" /> Error
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
        <WifiOff className="h-3 w-3" /> {session.status}
      </Badge>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <code className="rounded bg-muted px-2 py-1 text-sm font-medium">{name}</code>
        {statusBadge()}
      </div>

      {/* Error Display */}
      {session.last_error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {session.last_error}
          </p>
        </div>
      )}

      {/* QR Code Area */}
      {session.status !== "connected" && (
        <div className="max-w-sm">
          {session.qr_code ? (
            <div className="text-center">
              <div className="mx-auto mb-3 inline-block rounded-lg bg-white p-4">
                {isQrBase64 ? (
                  <img
                    src={session.qr_code.startsWith("data:") ? session.qr_code : `data:image/png;base64,${session.qr_code}`}
                    alt="QR Code"
                    className="h-[200px] w-[200px]"
                  />
                ) : (
                  <QRCode value={session.qr_code} size={200} />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">Scan QR code ini dengan WhatsApp di HP.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onAction("connect", name)} disabled={isLoading("connect")}>
                {isLoading("connect") ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Refresh QR
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">
                {countdown > 0
                  ? `QR belum tersedia. Auto-refresh dalam ${countdown}s... (${autoRefreshCount}/${MAX_AUTO_REFRESH})`
                  : autoRefreshCount >= MAX_AUTO_REFRESH
                    ? "Auto-refresh selesai. Coba Reconnect Wizard di bawah."
                    : "QR belum tersedia."
                }
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setAutoRefreshCount(0); onAction("connect", name); }} disabled={isLoading("connect")}>
                {isLoading("connect") ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Fetch QR
              </Button>
            </div>
          )}
        </div>
      )}

      {session.status === "connected" && (
        <div className="rounded-lg border border-green-500/30 bg-green-50 p-4 text-center max-w-sm dark:bg-green-500/10">
          <Wifi className="mx-auto mb-1 h-6 w-6 text-green-600" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">Device terhubung!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => onAction("restart", name)} disabled={isAnyLoading} className="gap-2">
          {isLoading("restart") ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Restart
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAction("logout", name)} disabled={isAnyLoading} className="gap-2">
          {isLoading("logout") ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />}
          Logout
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isAnyLoading} className="gap-2">
              {isLoading("delete") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Instance "{name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Instance akan dihapus dari VPS dan database. Aksi ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => onAction("delete", name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Reconnect Wizard */}
      <Collapsible open={wizardOpen} onOpenChange={setWizardOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Reconnect Wizard
            <ChevronDown className={`h-4 w-4 transition-transform ${wizardOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Jalankan langkah-langkah berikut secara berurutan:</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={isAnyLoading} onClick={() => onAction("set-webhook", name)}>
                {isLoading("set-webhook") ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-mono text-xs bg-primary/10 text-primary rounded px-1.5">1</span>}
                Perbaiki Webhook
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={isAnyLoading} onClick={() => onAction("restart", name)}>
                {isLoading("restart") ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-mono text-xs bg-primary/10 text-primary rounded px-1.5">2</span>}
                Restart Instance
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={isAnyLoading} onClick={() => { setAutoRefreshCount(0); onAction("connect", name); }}>
                {isLoading("connect") ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-mono text-xs bg-primary/10 text-primary rounded px-1.5">3</span>}
                Ambil QR Ulang
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
