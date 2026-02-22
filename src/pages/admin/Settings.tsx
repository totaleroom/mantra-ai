import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, TestTube, Save, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Admin {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [saving, setSaving] = useState(false);

  // Admin invite form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  // Evolution test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Webhook URL
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-webhook`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSettings(), loadAdmins()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data: session } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("manage-settings", {
      method: "GET",
    });
    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error.message });
      return;
    }
    setSettings(res.data?.settings || {});
  };

  const loadAdmins = async () => {
    const res = await supabase.functions.invoke("manage-admin", {
      method: "GET",
    });
    if (res.error) {
      toast({ variant: "destructive", title: "Error", description: res.error.message });
      return;
    }
    setAdmins(res.data?.admins || []);
  };

  const saveSettings = async (updates: Record<string, string>) => {
    setSaving(true);
    const res = await supabase.functions.invoke("manage-settings", {
      body: { settings: updates },
    });
    if (res.error || res.data?.error) {
      toast({ variant: "destructive", title: "Error", description: res.error?.message || res.data?.error });
    } else {
      toast({ title: "Settings disimpan" });
      setSettings((prev) => ({ ...prev, ...updates }));
    }
    setSaving(false);
  };

  const handleInviteAdmin = async () => {
    if (!inviteEmail || !invitePassword) return;
    setInviting(true);
    const res = await supabase.functions.invoke("manage-admin", {
      body: { email: inviteEmail, password: invitePassword },
    });
    if (res.error || res.data?.error) {
      toast({ variant: "destructive", title: "Error", description: res.error?.message || res.data?.error });
    } else {
      toast({ title: "Admin ditambahkan" });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      loadAdmins();
    }
    setInviting(false);
  };

  const handleDeleteAdmin = async (userId: string) => {
    const res = await supabase.functions.invoke("manage-admin", {
      body: { user_id: userId },
      method: "DELETE" as any,
    });
    if (res.error || res.data?.error) {
      toast({ variant: "destructive", title: "Error", description: res.error?.message || res.data?.error });
    } else {
      toast({ title: "Admin dihapus" });
      loadAdmins();
    }
  };

  const handleTestEvolution = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await supabase.functions.invoke("manage-settings", {
      body: {
        api_url: settings.evolution_api_url || "",
        api_key: settings.evolution_api_key || "",
      },
      headers: { action: "test-evolution" },
    });
    // Workaround: use query param via direct fetch
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    try {
      const directRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-settings?action=test-evolution`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            api_url: settings.evolution_api_url || "",
            api_key: settings.evolution_api_key || "",
          }),
        }
      );
      const data = await directRes.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? `Terhubung! ${data.instances} instance ditemukan.`
          : `Gagal: ${data.error}`,
      });
    } catch {
      setTestResult({ success: false, message: "Koneksi gagal" });
    }
    setTesting(false);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <Tabs defaultValue="admins">
        <TabsList className="mb-4">
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp API</TabsTrigger>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="safety">Safety & Limits</TabsTrigger>
        </TabsList>

        {/* Tab 1: Admin Users */}
        <TabsContent value="admins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Kelola akun admin yang bisa mengakses dashboard.</CardDescription>
              </div>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Invite Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Admin Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
                    <Button onClick={handleInviteAdmin} disabled={inviting}>
                      {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Tambah Admin
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.email}</TableCell>
                      <TableCell>{new Date(admin.created_at).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Admin?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Admin "{admin.email}" akan kehilangan akses dashboard.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAdmin(admin.user_id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: WhatsApp API */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp / Evolution API</CardTitle>
              <CardDescription>Konfigurasi koneksi ke Evolution API untuk WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Evolution API URL</Label>
                <Input
                  value={settings.evolution_api_url || ""}
                  onChange={(e) => updateSetting("evolution_api_url", e.target.value)}
                  placeholder="https://your-evolution-api.com"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.evolution_api_key || ""}
                  onChange={(e) => updateSetting("evolution_api_key", e.target.value)}
                  placeholder="Evolution API key"
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  type="password"
                  value={settings.wa_webhook_secret || ""}
                  onChange={(e) => updateSetting("wa_webhook_secret", e.target.value)}
                  placeholder="Secret untuk verifikasi webhook"
                />
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/50">
                <Label className="text-sm font-medium">Webhook URL</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Set URL ini di Evolution API dashboard sebagai webhook callback.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background rounded px-3 py-2 border border-border break-all">
                    {webhookUrl}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleTestEvolution} disabled={testing}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube className="mr-2 h-4 w-4" />}
                  Test Connection
                </Button>
                {testResult && (
                  <Badge variant={testResult.success ? "default" : "destructive"}>
                    {testResult.message}
                  </Badge>
                )}
              </div>

              <Button
                onClick={() =>
                  saveSettings({
                    evolution_api_url: settings.evolution_api_url || "",
                    evolution_api_key: settings.evolution_api_key || "",
                    wa_webhook_secret: settings.wa_webhook_secret || "",
                  })
                }
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Simpan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: AI Configuration */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Konfigurasi model AI dan system prompt untuk chatbot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  rows={6}
                  value={settings.ai_system_prompt ? settings.ai_system_prompt.replace(/^"|"$/g, "") : ""}
                  onChange={(e) => updateSetting("ai_system_prompt", JSON.stringify(e.target.value))}
                  placeholder="System prompt untuk AI..."
                />
                <p className="text-xs text-muted-foreground">
                  Gunakan {"{{business_name}}"} untuk nama bisnis dan {"{{context}}"} untuk konteks RAG.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Model AI</Label>
                <Select
                  value={settings.ai_model ? settings.ai_model.replace(/^"|"$/g, "") : "google/gemini-2.5-flash-lite"}
                  onValueChange={(v) => updateSetting("ai_model", JSON.stringify(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Cepat & Murah)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Seimbang)</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Akurat)</SelectItem>
                    <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash Preview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperature: {settings.ai_temperature || "0.3"}</Label>
                <Slider
                  value={[parseFloat(settings.ai_temperature || "0.3")]}
                  onValueChange={([v]) => updateSetting("ai_temperature", String(v))}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  0 = sangat deterministik, 1 = sangat kreatif
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={settings.ai_max_tokens || "1024"}
                  onChange={(e) => updateSetting("ai_max_tokens", e.target.value)}
                  min={100}
                  max={8192}
                />
              </div>
              <Button
                onClick={() =>
                  saveSettings({
                    ai_system_prompt: settings.ai_system_prompt || "",
                    ai_model: settings.ai_model || "",
                    ai_temperature: settings.ai_temperature || "0.3",
                    ai_max_tokens: settings.ai_max_tokens || "1024",
                  })
                }
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Simpan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Safety & Limits */}
        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle>Safety & Limits</CardTitle>
              <CardDescription>Pengaturan default untuk client baru dan anti-ban.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Daily Message Limit</Label>
                  <Input
                    type="number"
                    value={settings.default_daily_message_limit || "300"}
                    onChange={(e) => updateSetting("default_daily_message_limit", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Quota Limit</Label>
                  <Input
                    type="number"
                    value={settings.default_quota_limit || "1000"}
                    onChange={(e) => updateSetting("default_quota_limit", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Anti-Ban Delay Min (detik)</Label>
                  <Input
                    type="number"
                    value={settings.anti_ban_delay_min || "2"}
                    onChange={(e) => updateSetting("anti_ban_delay_min", e.target.value)}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anti-Ban Delay Max (detik)</Label>
                  <Input
                    type="number"
                    value={settings.anti_ban_delay_max || "4"}
                    onChange={(e) => updateSetting("anti_ban_delay_max", e.target.value)}
                    min={2}
                    max={15}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pesan Eskalasi ke Customer</Label>
                <Textarea
                  rows={3}
                  value={settings.escalation_message ? settings.escalation_message.replace(/^"|"$/g, "") : ""}
                  onChange={(e) => updateSetting("escalation_message", JSON.stringify(e.target.value))}
                  placeholder="Pesan yang dikirim saat customer di-eskalasi ke admin..."
                />
              </div>
              <Button
                onClick={() =>
                  saveSettings({
                    default_daily_message_limit: settings.default_daily_message_limit || "300",
                    default_quota_limit: settings.default_quota_limit || "1000",
                    anti_ban_delay_min: settings.anti_ban_delay_min || "2",
                    anti_ban_delay_max: settings.anti_ban_delay_max || "4",
                    escalation_message: settings.escalation_message || "",
                  })
                }
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Simpan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
