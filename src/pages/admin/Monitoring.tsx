import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Users, AlertTriangle, Bell, Check } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useClientsList, useMessageLogs, useBillingAlerts } from "@/hooks/useAdminData";

export default function Monitoring() {
  const [dateRange, setDateRange] = useState("7");
  const [filterClient, setFilterClient] = useState("all");
  const queryClient = useQueryClient();

  const { data: clients = [] } = useClientsList();
  const { data: logs = [] } = useMessageLogs(dateRange, filterClient);
  const { data: alerts = [] } = useBillingAlerts();

  const markRead = async (id: string) => {
    await supabase.from("billing_alerts" as any).update({ is_read: true } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["billingAlerts"] });
  };

  const chartData = logs.reduce<Record<string, { date: string; messages: number; tokens: number }>>((acc, log) => {
    const key = log.log_date;
    if (!acc[key]) acc[key] = { date: key, messages: 0, tokens: 0 };
    acc[key].messages += log.message_count;
    acc[key].tokens += log.token_usage;
    return acc;
  }, {});

  const totalMessagesToday = logs
    .filter((l) => l.log_date === new Date().toISOString().split("T")[0])
    .reduce((sum, l) => sum + l.message_count, 0);

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

  // For lowest quota, we need full client data
  const clientsWithQuota = clients as any[];
  const lowestQuotaClient = clientsWithQuota.length
    ? clientsWithQuota.reduce((min: any, c: any) => ((c.quota_remaining ?? Infinity) < (min.quota_remaining ?? Infinity) ? c : min), clientsWithQuota[0])
    : null;

  const clientNameMap = new Map(clients.map((c) => [c.id, c.name]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Monitoring & Billing</h1>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pesan Hari Ini</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalMessagesToday}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Klien</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{clients.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kuota Terendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lowestQuotaClient?.quota_remaining ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{lowestQuotaClient?.name ?? ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alert Belum Dibaca</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{unreadAlerts}</p></CardContent>
        </Card>
      </div>

      {/* Chart Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 Hari</SelectItem>
            <SelectItem value="30">30 Hari</SelectItem>
            <SelectItem value="90">90 Hari</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Client</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Pesan per Hari</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.values(chartData)}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="messages" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts Panel */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Alerts {unreadAlerts > 0 && <Badge className="ml-2">{unreadAlerts}</Badge>}
        </h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada alert.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                  alert.is_read ? "border-border bg-background" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div>
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {clientNameMap.get(alert.client_id) || "Unknown"} · {new Date(alert.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                {!alert.is_read && (
                  <Button variant="ghost" size="icon" onClick={() => markRead(alert.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
