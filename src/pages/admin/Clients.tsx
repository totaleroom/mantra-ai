import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  subscription_plan: string;
  status: string;
  quota_remaining: number;
  quota_limit: number;
  created_at: string;
  wa_status?: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", industry: "", subscription_plan: "basic" });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    setLoading(true);
    const { data: clientsData, error } = await supabase
      .from("clients" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setLoading(false);
      return;
    }

    // Fetch wa_sessions for status
    const { data: sessions } = await supabase
      .from("wa_sessions" as any)
      .select("client_id, status");

    const sessionMap = new Map((sessions as any[] || []).map((s: any) => [s.client_id, s.status]));
    const enriched = (clientsData as any[] || []).map((c: any) => ({
      ...c,
      wa_status: sessionMap.get(c.id) || "disconnected",
    }));

    setClients(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const getStatusBadge = (client: Client) => {
    if (client.quota_remaining <= 0)
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Kuota Habis</Badge>;
    if (client.wa_status === "connected")
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Connected</Badge>;
    return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Disconnected</Badge>;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Nama client wajib diisi." });
      return;
    }
    setSubmitting(true);
    try {
      if (editingClient) {
        const { error } = await supabase
          .from("clients" as any)
          .update({ name: form.name, industry: form.industry || null, subscription_plan: form.subscription_plan } as any)
          .eq("id", editingClient.id);
        if (error) throw error;
        toast({ title: "Client diperbarui" });
      } else {
        const { error } = await supabase
          .from("clients" as any)
          .insert({ name: form.name, industry: form.industry || null, subscription_plan: form.subscription_plan } as any);
        if (error) throw error;
        toast({ title: "Client ditambahkan" });
      }
      setDialogOpen(false);
      setEditingClient(null);
      setForm({ name: "", industry: "", subscription_plan: "basic" });
      fetchClients();
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
      fetchClients();
    }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({ name: client.name, industry: client.industry || "", subscription_plan: client.subscription_plan });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setForm({ name: "", industry: "", subscription_plan: "basic" });
    setDialogOpen(true);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || "").toLowerCase().includes(search.toLowerCase())
  );

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
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. F&B, Retail" />
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

      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
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
                <TableHead>Nama</TableHead>
                <TableHead>Industri</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search ? "Tidak ditemukan" : "Belum ada client"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.industry || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{client.subscription_plan}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(client)}</TableCell>
                    <TableCell>{client.quota_remaining}/{client.quota_limit}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                              <AlertDialogAction onClick={() => handleDelete(client.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
