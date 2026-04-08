import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const JoinEvent = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    const events = JSON.parse(localStorage.getItem("planit_events") || "[]");
    const event = events.find((e: any) => e.code === code.toUpperCase().trim());
    if (event) {
      navigate(`/guest/${event.code}`);
    } else {
      setError("Event not found. Check your code and try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-6">
      <button onClick={() => navigate("/home")} className="self-start mb-8">
        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-secondary rounded-[var(--radius)] p-6 w-full max-w-sm border border-border text-center">
          <h2 className="text-secondary-foreground font-extrabold text-xl mb-1">Enter your code</h2>
          <p className="text-muted-foreground text-sm mb-5">Got an invite? Enter the 6 character code below.</p>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase().slice(0, 6)); setError(""); }}
            placeholder="ABC123"
            maxLength={6}
            className="w-full bg-background rounded-[var(--radius)] px-4 py-3.5 text-center text-2xl font-extrabold tracking-[0.3em] text-secondary-foreground placeholder:text-muted-foreground outline-none border border-border"
          />
          {error && <p className="text-destructive text-xs mt-2 font-semibold">{error}</p>}
        </div>
      </div>

      <button
        onClick={handleJoin}
        disabled={code.trim().length < 6}
        className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-5 text-xl font-extrabold disabled:opacity-40"
      >
        Join Event
      </button>
    </div>
  );
};

export default JoinEvent;
