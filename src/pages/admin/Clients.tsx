import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, MoreHorizontal, Power, QrCode, Brain, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import QRCode from "react-qr-code";
import { useQueryClient } from "@tanstack/react-query";
import { useClients, useWaSessions, useActiveConversations } from "@/hooks/useAdminData";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  subscription_plan: string;
  status: string;
  quota_remaining: number;
  quota_limit: number;
  created_at: string;
  daily_message_limit: number;
  last_activity_at: string | null;
  wa_status?: string;
  live_chats?: number;
}

const industryColors: Record<string, string> = {
  "f&b": "bg-orange-500/15 text-orange-700 border-orange-500/30",
  "fnb": "bg-orange-500/15 text-orange-700 border-orange-500/30",
  "salon": "bg-pink-500/15 text-pink-700 border-pink-500/30",
  "beauty": "bg-pink-500/15 text-pink-700 border-pink-500/30",
  "real estate": "bg-blue-500/15 text-blue-700 border-blue-500/30",
  "property": "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

function getIndustryBadgeClass(industry: string | null): string {
  if (!industry) return "bg-muted text-muted-foreground";
  const key = industry.toLowerCase();
  for (const [k, v] of Object.entries(industryColors)) {
    if (key.includes(k)) return v;
  }
  return "bg-muted text-muted-foreground";
}

export default function Clients() {
  const queryClient = useQueryClient();
  const { data: rawClients = [], isLoading: loadingClients } = useClients();
  const { data: sessions = [] } = useWaSessions();
  const { data: activeConvos = [] } = useActiveConversations();

  const clients = useMemo(() => {
    const sessionMap = new Map(sessions.map((s: any) => [s.client_id, s.status]));
    const convoCountMap = new Map<string, number>();
    for (const c of activeConvos) {
      convoCountMap.set(c.client_id, (convoCountMap.get(c.client_id) || 0) + 1);
    }
    const enriched: Client[] = rawClients.map((c: any) => ({
      ...c,
      wa_status: sessionMap.get(c.id) || "disconnected",
      live_chats: convoCountMap.get(c.id) || 0,
    }));
    enriched.sort((a, b) => {
      if (!a.last_activity_at && !b.last_activity_at) return 0;
      if (!a.last_activity_at) return 1;
      if (!b.last_activity_at) return -1;
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });
    return enriched;
  }, [rawClients, sessions, activeConvos]);

  const loading = loadingClients;
  const invalidateClients = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["waSessions"] });
    queryClient.invalidateQueries({ queryKey: ["activeConversations"] });
  };

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: "", industry: "", subscription_plan: "basic",
    quota_limit: 1000, quota_remaining: 1000, daily_message_limit: 300, status: "active",
  });
  const [submitting, setSubmitting] = useState(false);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrClientName, setQrClientName] = useState("");

  // Prompt modal
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptClient, setPromptClient] = useState<Client | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);

  const { toast } = useToast();

  const getStatusBadge = (client: Client) => {
    if (client.quota_remaining <= 0)
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-[10px]">Kuota Habis</Badge>;
    if (client.wa_status === "connected")
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-[10px]">Connected</Badge>;
    return <Badge className="bg-red-500/20 text-red-700 border-red-500/30 text-[10px]">Disconnected</Badge>;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Nama client wajib diisi." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name, industry: form.industry || null, subscription_plan: form.subscription_plan,
        quota_limit: form.quota_limit, quota_remaining: form.quota_remaining,
        daily_message_limit: form.daily_message_limit, status: form.status,
      };
      if (editingClient) {
        const { error } = await supabase.from("clients" as any).update(payload as any).eq("id", editingClient.id);
        if (error) throw error;
        toast({ title: "Client diperbarui" });
      } else {
        const { error } = await supabase.from("clients" as any).insert(payload as any);
        if (error) throw error;
        toast({ title: "Client ditambahkan" });
      }
      setDialogOpen(false);
      setEditingClient(null);
      setForm({ name: "", industry: "", subscription_plan: "basic", quota_limit: 1000, quota_remaining: 1000, daily_message_limit: 300, status: "active" });
      invalidateClients();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clients" as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Client dihapus" });
      invalidateClients();
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const newStatus = client.status === "active" ? "inactive" : "active";
    await supabase.from("clients" as any).update({ status: newStatus } as any).eq("id", client.id);
    toast({ title: `Status diubah ke ${newStatus}` });
    invalidateClients();
  };

  const handleViewQR = async (client: Client) => {
    setQrClientName(client.name);
    setQrLoading(true);
    setQrData(null);
    setQrOpen(true);
    const { data } = await supabase
      .from("wa_sessions" as any)
      .select("qr_code")
      .eq("client_id", client.id)
      .maybeSingle();
    setQrData((data as any)?.qr_code || null);
    setQrLoading(false);
  };

  const handleEditPrompt = async (client: Client) => {
    setPromptClient(client);
    // Load from platform_settings
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", `client_prompt_${client.id}`)
      .maybeSingle();
    setPromptValue((data as any)?.value?.replace(/^"|"$/g, "") || "");
    setPromptOpen(true);
  };

  const handleSavePrompt = async () => {
    if (!promptClient) return;
    setPromptSaving(true);
    await supabase.from("platform_settings" as any).upsert({
      key: `client_prompt_${promptClient.id}`,
      value: promptValue,
    } as any, { onConflict: "key" } as any);
    toast({ title: "Prompt disimpan" });
    setPromptSaving(false);
    setPromptOpen(false);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name, industry: client.industry || "", subscription_plan: client.subscription_plan,
      quota_limit: client.quota_limit, quota_remaining: client.quota_remaining,
      daily_message_limit: client.daily_message_limit || 300, status: client.status,
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setForm({ name: "", industry: "", subscription_plan: "basic", quota_limit: 1000, quota_remaining: 1000, daily_message_limit: 300, status: "active" });
    setDialogOpen(true);
  };

  // Get unique industries for filter
  const industries = [...new Set(clients.map((c) => c.industry).filter(Boolean))] as string[];

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry || "").toLowerCase().includes(search.toLowerCase());
    const matchIndustry = industryFilter === "all" || (c.industry || "").toLowerCase() === industryFilter.toLowerCase();
    const matchStatus = statusFilter === "all"
      || (statusFilter === "connected" && c.wa_status === "connected")
      || (statusFilter === "disconnected" && c.wa_status !== "connected" && c.quota_remaining > 0)
      || (statusFilter === "quota_habis" && c.quota_remaining <= 0);
    return matchSearch && matchIndustry && matchStatus;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add Client"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama client" />
              </div>
              <div className="space-y-2">
                <Label>Industri</Label>
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. F&B, Salon, Real Estate" />
              </div>
              <div className="space-y-2">
                <Label>Paket Langganan</Label>
                <Select value={form.subscription_plan} onValueChange={(v) => setForm({ ...form, subscription_plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quota Limit</Label>
                  <Input type="number" value={form.quota_limit} onChange={(e) => setForm({ ...form, quota_limit: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Quota Remaining</Label>
                  <Input type="number" value={form.quota_remaining} onChange={(e) => setForm({ ...form, quota_remaining: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Message Limit</Label>
                <Input type="number" value={form.daily_message_limit} onChange={(e) => setForm({ ...form, daily_message_limit: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari client..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[200px] h-8 text-sm" />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Semua Industri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Industri</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind.toLowerCase()}>{ind}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="quota_habis">Kuota Habis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-3 text-xs">Nama</TableHead>
                <TableHead className="py-2 px-3 text-xs">Niche</TableHead>
                <TableHead className="py-2 px-3 text-xs">Status</TableHead>
                <TableHead className="py-2 px-3 text-xs">Active Chats</TableHead>
                <TableHead className="py-2 px-3 text-xs">Kuota</TableHead>
                <TableHead className="py-2 px-3 text-xs">Last Activity</TableHead>
                <TableHead className="py-2 px-3 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                    {search || industryFilter !== "all" || statusFilter !== "all" ? "Tidak ditemukan" : "Belum ada client"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow
                    key={client.id}
                    className={`hover:bg-muted/30 ${client.status === "inactive" ? "opacity-60" : ""}`}
                  >
                    <TableCell className="py-2 px-3 text-sm font-medium">{client.name}</TableCell>
                    <TableCell className="py-2 px-3">
                      {client.industry ? (
                        <Badge variant="outline" className={`text-[10px] ${getIndustryBadgeClass(client.industry)}`}>
                          {client.industry}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">{getStatusBadge(client)}</TableCell>
                    <TableCell className="py-2 px-3 text-sm">
                      {(client.live_chats || 0) > 0 ? (
                        <span className="font-medium text-foreground">{client.live_chats}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs text-muted-foreground">
                      {client.quota_remaining}/{client.quota_limit}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs text-muted-foreground">
                      {client.last_activity_at
                        ? formatDistanceToNow(new Date(client.last_activity_at), { addSuffix: true, locale: idLocale })
                        : "—"}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleStatus(client)}>
                            <Power className="mr-2 h-3.5 w-3.5" />
                            {client.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewQR(client)}>
                            <QrCode className="mr-2 h-3.5 w-3.5" />
                            View QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPrompt(client)}>
                            <Brain className="mr-2 h-3.5 w-3.5" />
                            Edit AI Prompt
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit Client
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Client?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Semua data terkait "{client.name}" akan dihapus permanen.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(client.id)}>Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — {qrClientName}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : qrData ? (
              <QRCode value={qrData} size={200} />
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada QR code. Session belum dimulai.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt Modal */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Prompt — {promptClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Custom System Prompt</Label>
            <Textarea
              rows={8}
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder="Kosongkan untuk menggunakan prompt global default..."
            />
            <p className="text-xs text-muted-foreground">
              Prompt khusus untuk client ini. Jika kosong, akan menggunakan prompt global dari Settings.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleSavePrompt} disabled={promptSaving}>
              {promptSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
