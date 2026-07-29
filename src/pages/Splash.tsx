import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Splash = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#2563eb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>

      {/* Covo icon — inline SVG, scales to fill most of the screen width */}
      <svg
        viewBox="0 0 880 430"
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="gloss" cx="32%" cy="22%" r="85%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#ffffff" />
            <stop offset="75%" stopColor="#eef1f9" />
            <stop offset="100%" stopColor="#c7cfe3" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="glareBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <g transform="translate(60,60)">
          <g transform="translate(5,12)" opacity="0.5" filter="url(#soft)">
            <path d="M 168.94 207.87 A 90 90 0 1 1 130.78 65.4" fill="none" stroke="#061a63" strokeWidth="108" strokeLinecap="round" />
            <circle cx="290" cy="150" r="90" fill="none" stroke="#061a63" strokeWidth="108" />
            <path d="M 386 74 L 464 272 L 560 56" fill="none" stroke="#061a63" strokeWidth="108" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="650" cy="150" r="90" fill="none" stroke="#061a63" strokeWidth="108" />
          </g>
          <path d="M 168.94 207.87 A 90 90 0 1 1 130.78 65.4" fill="none" stroke="url(#gloss)" strokeWidth="104" strokeLinecap="round" />
          <circle cx="290" cy="150" r="90" fill="none" stroke="url(#gloss)" strokeWidth="104" />
          <path d="M 386 74 L 464 272 L 560 56" fill="none" stroke="url(#gloss)" strokeWidth="104" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="650" cy="150" r="90" fill="none" stroke="url(#gloss)" strokeWidth="104" />
          <circle cx="290" cy="150" r="35" fill="#1c5bf7" opacity="0.9" />
          <circle cx="650" cy="150" r="35" fill="#1c5bf7" opacity="0.9" />
          <ellipse cx="80" cy="87" rx="28" ry="12" fill="#ffffff" opacity="0.95" transform="rotate(-35 80 87)" filter="url(#glareBlur)" />
          <ellipse cx="262" cy="93" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-35 262 93)" filter="url(#glareBlur)" />
          <ellipse cx="415" cy="80" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-30 415 80)" filter="url(#glareBlur)" />
          <ellipse cx="622" cy="93" rx="20" ry="9" fill="#ffffff" opacity="0.8" transform="rotate(-35 622 93)" filter="url(#glareBlur)" />
        </g>
      </svg>

      {/* Buttons */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        maxWidth: 340,
        position: "absolute",
        bottom: 52,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0 28px",
      }}>
        {/* Sign up — primary */}
        <button
          onClick={() => navigate("/signup")}
          style={{
            height: 56,
            border: "none",
            borderRadius: 999,
            background: "#ffffff",
            color: "#2563eb",
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 700,
            fontSize: 17,
            cursor: "pointer",
          }}
        >
          Sign up
        </button>

        {/* Log in — secondary */}
        <button
          onClick={() => navigate("/login")}
          style={{
            height: 56,
            border: "2px solid rgba(255,255,255,0.6)",
            borderRadius: 999,
            background: "transparent",
            color: "#ffffff",
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 700,
            fontSize: 17,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
      </div>

    </div>
  );
};

export default Splash;
