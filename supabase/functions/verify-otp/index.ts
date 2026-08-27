import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "phone and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken  = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    // TEMPORARY DEBUG - returned in the response body (not just logged) since
    // the logs panel doesn't surface curl-triggered edge function invocations.
    // Remove once compared against send-otp's _debug output.
    const _debug = {
      serviceSidPrefix: serviceSid?.slice(0, 8) ?? "undefined",
      accountSidPrefix: accountSid?.slice(0, 8) ?? "undefined",
    };

    if (!accountSid || !authToken || !serviceSid) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured", _debug }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`;

    console.log("verify-otp: checking code against Twilio for phone:", phone);

    const body = new URLSearchParams({ To: phone, Code: code });

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
      // Twilio error 20404 here means it has no pending verification matching
      // this exact phone string (doesn't match what send-otp used, or it
      // already expired/was checked). Error 60202 means too many incorrect
      // check attempts were already made against this verification - a fresh
      // code (new send-otp call) is required, and no code will be accepted
      // against the old one anymore.
      console.error("verify-otp: Twilio rejected check for phone:", phone, "code:", data.code, "response:", data);
      const message =
        data.code === 60202
          ? "Too many incorrect attempts. Please request a new code."
          : data.code === 20404
            ? "This code has expired or is no longer valid. Please request a new code."
            : data.message || "Verification failed";
      // twilioRaw includes Twilio's own error message, which embeds the exact
      // Service SID it tried to query in its URL - an independent cross-check
      // against _debug.serviceSidPrefix (which is just what Deno.env.get read).
      return new Response(JSON.stringify({ error: message, _debug, twilioRaw: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A genuinely correct code always comes back with status "approved" here.
    // Anything else - almost always "pending" - means Twilio compared the
    // submitted code against the current verification and it didn't match.
    if (data.status !== "approved") {
      console.log("verify-otp: code did not match for phone:", phone, "Twilio status:", data.status);
      return new Response(JSON.stringify({ error: `Incorrect code (status: ${data.status})`, _debug }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, _debug }), {
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
