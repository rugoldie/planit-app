import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    codeRefs.current = codeRefs.current.slice(0, 6);
  }, []);

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleContinue = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      localStorage.setItem(
        "planit_user",
        JSON.stringify({ email, phone, name, events: [] })
      );
      navigate("/home");
    }
  };

  const isButtonDisabled = () => {
    if (step === 0) return !email;
    if (step === 1) return !phone;
    if (step === 2) return code.some((d) => !d);
    if (step === 3) return !name;
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={handleBack} className="self-start">
        <ArrowLeft className="w-7 h-7 text-foreground" />
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        {step === 0 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs shadow-sm">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your email?
            </h2>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted text-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {step === 1 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs shadow-sm">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your number?
            </h2>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-muted text-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {step === 2 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs shadow-sm">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              Enter your code
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a 6 digit code to your number
            </p>
            <div className="flex gap-2 justify-center mb-4">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-10 h-12 bg-muted text-foreground text-center text-lg font-bold rounded-[var(--radius)] outline-none"
                />
              ))}
            </div>
            <button
              onClick={() => setCode(["", "", "", "", "", ""])}
              className="text-sm text-muted-foreground underline w-full text-center"
            >
              Resend code
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-xs shadow-sm">
            <h2 className="text-xl font-bold text-card-foreground mb-4">
              What's your name?
            </h2>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted text-foreground rounded-[var(--radius)] px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={isButtonDisabled()}
        className="w-full max-w-xs mx-auto bg-foreground text-background rounded-[var(--radius)] py-4 text-lg font-bold disabled:opacity-50"
      >
        {step === 2 ? "Verify" : step === 3 ? "Let's go" : "Continue"}
      </button>
    </div>
  );
};

export default SignUp;
