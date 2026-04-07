import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const steps = [
  { label: "What's your email?", placeholder: "Email address", type: "email" },
  { label: "What's your number?", placeholder: "Phone number", type: "tel" },
  { label: "What's your name?", placeholder: "Your name", type: "text" },
];

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(["", "", ""]);

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Save name to localStorage for profile
      localStorage.setItem("planit_user", JSON.stringify({
        email: values[0],
        phone: values[1],
        name: values[2],
        events: [],
      }));
      navigate("/home");
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={handleBack} className="self-start mb-auto">
        <ArrowLeft className="w-7 h-7 text-foreground" />
      </button>

      <div className="flex flex-col items-center flex-1 justify-center gap-6">
        <h2 className="text-2xl font-bold text-foreground">{steps[step].label}</h2>
        <input
          type={steps[step].type}
          placeholder={steps[step].placeholder}
          value={values[step]}
          onChange={(e) => {
            const next = [...values];
            next[step] = e.target.value;
            setValues(next);
          }}
          className="w-full max-w-xs bg-card text-card-foreground rounded-[var(--radius)] px-5 py-4 text-lg outline-none shadow-sm placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={handleContinue}
        className="w-full max-w-xs mx-auto bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-lg font-bold mt-auto"
      >
        Continue
      </button>
    </div>
  );
};

export default SignUp;
