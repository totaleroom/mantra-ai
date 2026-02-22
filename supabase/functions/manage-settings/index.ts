import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("platform_settings")
        .select("key, value, updated_at");
      if (error) throw error;

      const settings: Record<string, string> = {};
      for (const row of data || []) {
        settings[row.key] = row.value;
      }

      return new Response(JSON.stringify({ settings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Test Evolution API connection
      if (action === "test-evolution") {
        const { api_url, api_key } = await req.json();
        if (!api_url || !api_key) throw new Error("api_url and api_key required");

        try {
          const baseUrl = api_url.replace(/\/$/, "");
          const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
            headers: { apikey: api_key },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return new Response(
            JSON.stringify({ success: true, instances: Array.isArray(data) ? data.length : 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Connection failed" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Upsert settings
      const { settings } = await req.json();
      if (!settings || typeof settings !== "object") throw new Error("settings object required");

      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabaseAdmin
          .from("platform_settings")
          .upsert(
            { key, value: String(value), updated_at: new Date().toISOString() },
            { onConflict: "key" }
          );
        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
