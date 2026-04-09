import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import CountryCodeSelector from "@/components/CountryCodeSelector";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+44");
  const [phone, setPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setLoading(true);
      const fullPhone = `${countryCode}${phone}`;
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
          .update({ phone: fullPhone, name })
          .eq("user_id", data.user.id);
      }
      setLoading(false);
      navigate("/home");
    }
  };

  const isButtonDisabled = () => {
    if (step === 0) return !email;
    if (step === 1) return password.length < 6;
    if (step === 2) return !phone;
    if (step === 3) return otpValue.length < 6;
    if (step === 4) return !name;
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
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs border border-border">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Enter your code
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a 6 digit code to your number
            </p>
            <div className="flex justify-center mb-4">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="w-10 h-12 bg-muted text-card-foreground text-lg font-bold border-border"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <button
              onClick={() => setOtpValue("")}
              className="text-sm text-muted-foreground underline w-full text-center"
            >
              Resend code
            </button>
          </div>
        )}

        {step === 4 && (
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
        {loading ? "Please wait..." : step === 3 ? "Verify" : step === 4 ? "Let's go" : "Continue"}
      </button>
    </div>
  );
};

export default SignUp;
