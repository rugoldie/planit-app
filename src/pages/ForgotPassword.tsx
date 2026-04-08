import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={() => navigate("/login")} className="self-start">
        <ArrowLeft className="w-7 h-7 text-muted-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
          <h2 className="text-xl font-bold text-card-foreground mb-4">Reset password</h2>
          {sent ? (
            <p className="text-muted-foreground text-sm">
              Check your email for a password reset link.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm mb-4">
                Enter your email and we'll send you a reset link.
              </p>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
              />
              {error && <p className="text-destructive text-xs mt-2 font-semibold">{error}</p>}
            </>
          )}
        </div>
      </div>

      {!sent && (
        <button
          onClick={handleReset}
          disabled={!email || loading}
          className="w-full max-w-xs mx-auto bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-lg font-bold disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      )}
    </div>
  );
};

export default ForgotPassword;
