import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wifi, WifiOff, RotateCcw, LogOut as LogOutIcon, QrCode, Trash2 } from "lucide-react";
import QRCode from "react-qr-code";

interface WaSession {
  id: string;
  client_id: string;
  status: string;
  qr_code: string | null;
  instance_name: string | null;
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

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <code className="rounded bg-muted px-2 py-1 text-sm font-medium">{name}</code>
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
              <p className="text-sm text-muted-foreground mb-2">QR belum tersedia.</p>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => onAction("connect", name)} disabled={isLoading("connect")}>
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
        <Button variant="destructive" size="sm" onClick={() => onAction("delete", name)} disabled={isAnyLoading} className="gap-2">
          {isLoading("delete") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Hapus
        </Button>
      </div>
    </div>
  );
}
