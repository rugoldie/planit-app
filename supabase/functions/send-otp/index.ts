import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-way hash so we can compare TWILIO_AUTH_TOKEN across functions without
// ever exposing the actual secret value.
const shortHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    // TEMPORARY DEBUG - returned in the response body (not just logged) since
    // the logs panel doesn't surface curl-triggered edge function invocations.
    // Remove once compared against verify-otp's _debug output.
    const _debug = {
      serviceSidPrefix: serviceSid?.slice(0, 8) ?? "undefined",
      accountSidPrefix: accountSid?.slice(0, 8) ?? "undefined",
      authTokenHash: authToken ? await shortHash(authToken) : "undefined",
    };

    if (!accountSid || !authToken || !serviceSid) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured", _debug }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;

    console.log("send-otp: sending Verification to Twilio for phone:", phone);

    const body = new URLSearchParams({ To: phone, Channel: "sms" });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("send-otp: Twilio rejected phone:", phone, "response:", data);
      return new Response(JSON.stringify({ error: data.message || "Failed to send OTP", _debug }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, status: data.status, verificationSid: data.sid, _debug }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
