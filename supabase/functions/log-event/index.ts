import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse request body
    const { event_type, session_id, draft_id, platform_type, metadata } = await req.json();

    if (!event_type) {
      return new Response(
        JSON.stringify({ ok: false, error: "event_type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Authorization header for user_id
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data?.user) {
          userId = data.user.id;
        }
      } catch (e) {
        console.warn("[log-event] Token validation failed:", e);
      }
    }

    // Insert event with service role (bypasses RLS)
    const { error: insertError } = await supabaseAdmin.from("events").insert({
      event_type,
      session_id: session_id || null,
      user_id: userId,
      platform_type: platform_type || null,
      metadata: {
        ...(metadata || {}),
        draft_id: draft_id || null,
        is_guest: !userId,
      },
    });

    if (insertError) {
      console.error("[log-event] Insert error:", insertError);
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[log-event] Logged: ${event_type}`, { userId, session_id, draft_id, platform_type });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[log-event] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
