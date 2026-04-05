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
      // Provider-aware test (supports evolution, wwebjs, custom)
      if (action === "test-provider" || action === "test-evolution") {
        const { api_url, api_key, provider } = await req.json();
        const testProvider = provider || "evolution";

        const diagnostics: any = {
          success: false,
          instances: 0,
          latency_ms: 0,
          auth_valid: false,
          reachable: false,
          error_detail: null,
          http_status: null,
        };

        if (!api_url) {
          diagnostics.error_detail = "API URL tidak dikonfigurasi";
          return new Response(JSON.stringify(diagnostics), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const baseUrl = api_url.replace(/\/$/, "");
        const startTime = Date.now();

        try {
          let testUrl = "";
          const headers: Record<string, string> = {};

          if (testProvider === "evolution") {
            testUrl = `${baseUrl}/instance/fetchInstances`;
            if (api_key) headers.apikey = api_key;
          } else if (testProvider === "wwebjs") {
            testUrl = `${baseUrl}/status?token=${api_key || ""}`;
          } else {
            // Custom/n8n — just ping the URL
            testUrl = baseUrl;
          }

          const res = await fetch(testUrl, { headers });
          diagnostics.latency_ms = Date.now() - startTime;
          diagnostics.http_status = res.status;
          diagnostics.reachable = true;

          if (res.ok) {
            const data = await res.json();
            diagnostics.success = true;
            diagnostics.auth_valid = true;
            if (testProvider === "evolution") {
              diagnostics.instances = Array.isArray(data) ? data.length : 0;
            } else if (testProvider === "wwebjs") {
              diagnostics.instances = data?.sessions?.length || (data?.status ? 1 : 0);
            }
          } else {
            const errText = await res.text();
            diagnostics.auth_valid = res.status !== 401 && res.status !== 403;
            diagnostics.error_detail = `HTTP ${res.status}: ${errText.substring(0, 200)}`;
          }
        } catch (err) {
          diagnostics.latency_ms = Date.now() - startTime;
          diagnostics.error_detail = err instanceof Error ? err.message : "Connection failed";
        }

        return new Response(JSON.stringify(diagnostics), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
