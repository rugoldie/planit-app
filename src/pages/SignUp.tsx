import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "@/components/PasswordInput";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const passwordValid = hasMinLength && hasNumber;

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasNumber) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (password.length >= 10) score++;
    if (score <= 1) return { label: "weak", percent: 25, color: "#ef4444" };
    if (score <= 3) return { label: "medium", percent: 60, color: "#f97316" };
    return { label: "strong", percent: 100, color: "#2563eb" };
  }, [password, hasMinLength, hasNumber]);

  const handleBack = () => {
    setError("");
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  const handleContinue = async () => {
    setError("");
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (!passwordValid) {
        setError("Please meet all requirements above.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ name })
          .eq("user_id", data.user.id);
      }
      setLoading(false);
      navigate("/onboarding");
    }
  };

  const isButtonDisabled = () => {
    if (step === 0) return !email;
    if (step === 1) return !passwordValid;
    if (step === 2) return !name.trim();
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={handleBack} className="self-start">
        <ArrowLeft className="w-7 h-7 text-muted-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        {step === 0 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your email?
            </h2>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
            />
          </div>
        )}

        {step === 1 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Create a password
            </h2>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex items-center gap-2" style={{ color: hasMinLength ? "#2563eb" : "#999" }}>
                {hasMinLength ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
                At least 6 characters
              </li>
              <li className="flex items-center gap-2" style={{ color: hasNumber ? "#2563eb" : "#999" }}>
                {hasNumber ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 inline-block" />}
                At least one number
              </li>
            </ul>
            <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#333" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your name?
            </h2>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
            />
          </div>
        )}

        {error && <p className="text-destructive text-xs mt-3 font-semibold">{error}</p>}
      </div>

      <button
        onClick={handleContinue}
        disabled={isButtonDisabled() || loading}
        className="w-full max-w-xs mx-auto bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-lg font-bold disabled:opacity-50"
      >
        {loading ? "Please wait..." : step === 2 ? "Let's go" : "Continue"}
      </button>
    </div>
  );
};

export default SignUp;
