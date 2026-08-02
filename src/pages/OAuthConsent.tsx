import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as any).oauth as OAuthApi;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-10 items-center justify-center">
      <div className="w-full max-w-sm bg-card border border-border rounded-[var(--radius)] p-8">
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#aaee44", fontFamily: "'Fredoka', sans-serif" }}>
          planit
        </h1>

        {error ? (
          <p className="text-destructive text-sm font-semibold">Could not load this request: {error}</p>
        ) : !details ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            <h2 className="text-lg font-bold text-card-foreground mb-2">
              Connect {details.client?.name ?? "an app"} to your account
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This lets {details.client?.name ?? "the app"} view and manage your planit events as you.
            </p>
            <button
              onClick={() => decide(true)}
              disabled={busy}
              className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-3 text-base font-bold disabled:opacity-50 mb-3"
            >
              Approve
            </button>
            <button
              onClick={() => decide(false)}
              disabled={busy}
              className="w-full bg-muted text-card-foreground rounded-[var(--radius)] py-3 text-base font-semibold disabled:opacity-50"
            >
              Deny
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthConsent;
