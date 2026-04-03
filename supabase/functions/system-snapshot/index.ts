import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: accept Bearer token (admin JWT) or X-Api-Key (service role)
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("X-Api-Key");

    if (apiKey) {
      // Custom API key auth — compare with SNAPSHOT_API_KEY secret
      const snapshotApiKey = Deno.env.get("SNAPSHOT_API_KEY");
      if (!snapshotApiKey || apiKey !== snapshotApiKey) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (authHeader) {
      // JWT auth — verify admin role
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for data queries
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parallel data fetching
    const [
      clientsRes,
      sessionsRes,
      settingsRes,
      logsRes,
      docsRes,
      messagesTodayRes,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, status, subscription_plan, quota_remaining, quota_limit, daily_message_limit, last_activity_at, industry"),
      supabase
        .from("wa_sessions")
        .select("id, client_id, instance_name, status, last_error, last_webhook_event_at, updated_at"),
      supabase
        .from("platform_settings")
        .select("key, value"),
      supabase
        .from("wa_ops_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("documents")
        .select("client_id, status"),
      supabase
        .from("message_logs")
        .select("message_count, token_usage")
        .eq("log_date", new Date().toISOString().split("T")[0]),
    ]);

    // Aggregate message stats today
    const msgRows = messagesTodayRes.data || [];
    const messageStatsToday = {
      total_messages: msgRows.reduce((s, r) => s + (r.message_count || 0), 0),
      total_tokens: msgRows.reduce((s, r) => s + (r.token_usage || 0), 0),
    };

    // Aggregate document stats
    const docs = docsRes.data || [];
    const docsByStatus: Record<string, number> = {};
    for (const d of docs) {
      docsByStatus[d.status] = (docsByStatus[d.status] || 0) + 1;
    }

    // Settings as key-value map
    const settingsMap: Record<string, string> = {};
    for (const s of settingsRes.data || []) {
      settingsMap[s.key] = s.value;
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      clients: clientsRes.data || [],
      wa_sessions: sessionsRes.data || [],
      message_stats_today: messageStatsToday,
      platform_settings: settingsMap,
      documents: {
        total: docs.length,
        by_status: docsByStatus,
      },
      recent_ops_logs: logsRes.data || [],
    };

    return new Response(JSON.stringify(snapshot, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("system-snapshot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
