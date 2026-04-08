import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "@/components/PasswordInput";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
        setChecking(false);
      }
    });

    // Check URL hash for recovery tokens (handles case where event already fired)
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Let Supabase client process the hash automatically, then check session
      setTimeout(async () => {
        if (!mounted) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setReady(true);
        }
        setChecking(false);
      }, 1000);
    } else {
      // Also check if already have a valid session from the redirect
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        if (session) {
          setReady(true);
        }
        setChecking(false);
      });
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Sign out so they can log in with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={() => navigate("/login")} className="self-start">
        <ArrowLeft className="w-7 h-7 text-muted-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
          <h2 className="text-xl font-bold text-card-foreground mb-4">New password</h2>
          {success ? (
            <p className="text-muted-foreground text-sm">
              Password updated! Redirecting to login…
            </p>
          ) : checking ? (
            <p className="text-muted-foreground text-sm">
              Verifying reset link…
            </p>
          ) : !ready ? (
            <p className="text-destructive text-sm">
              This reset link is invalid or has expired. Please{" "}
              <button
                onClick={() => navigate("/forgot-password")}
                className="underline font-semibold text-primary"
              >
                request a new one
              </button>.
            </p>
          ) : (
            <>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border mb-3"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
              />
              {error && <p className="text-destructive text-xs mt-2 font-semibold">{error}</p>}
            </>
          )}
        </div>
      </div>

      {ready && !success && (
        <button
          onClick={handleUpdate}
          disabled={!password || !confirm || loading}
          className="w-full max-w-xs mx-auto bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-lg font-bold disabled:opacity-50"
        >
          {loading ? "Updating..." : "Set new password"}
        </button>
      )}
    </div>
  );
};

export default ResetPassword;
