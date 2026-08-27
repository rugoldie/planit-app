import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import CountryCodeSelector from "@/components/CountryCodeSelector";

// Combine a country code (e.g. "+44") with a national number, stripping
// non-digit characters and a leading trunk "0" (e.g. "07911 123456" -> "7911123456")
// so the result is a valid E.164 number instead of "+440..." or "+44 7911 123456".
const buildFullPhone = (countryCode: string, phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return `${countryCode}${digits}`;
};

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+44");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!username.trim()) {
        setError("Please choose a username.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (!passwordValid) {
        setError("Please meet all requirements above.");
        return;
      }
      setLoading(true);
      const fullPhone = buildFullPhone(countryCode, phone);
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
          .update({ name, username, phone: fullPhone })
          .eq("user_id", data.user.id);
      }
      setLoading(false);
      navigate("/onboarding");
    }
  };

  const isButtonDisabled = () => {
    if (step === 0) return !name.trim();
    if (step === 1) return !username.trim();
    if (step === 2) return !email;
    if (step === 3) return !phone;
    if (step === 4) return !passwordValid;
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

        {step === 1 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Pick a username
            </h2>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
            />
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your number?
            </h2>
            <div className="flex gap-2">
              <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-muted text-card-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground border border-border"
              />
            </div>
          </div>
        )}

        {step === 4 && (
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

        {error && <p className="text-destructive text-xs mt-3 font-semibold">{error}</p>}
      </div>

      <button
        onClick={handleContinue}
        disabled={isButtonDisabled() || loading}
        className="w-full max-w-xs mx-auto bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-lg font-bold disabled:opacity-50"
      >
        {loading ? "Please wait..." : step === 4 ? "Let's go" : "Continue"}
      </button>
    </div>
  );
};

export default SignUp;
