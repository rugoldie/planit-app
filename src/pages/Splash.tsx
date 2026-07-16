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
      padding: "0 28px 48px",
    }}>

      {/* Covo icon — inline SVG, same paths used for all icon assets */}
      <svg
        viewBox="0 0 1024 1024"
        width="280"
        height="280"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: 24 }}
      >
        <defs>
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#5570F0"/>
            <stop offset="100%" stopColor="#2840D8"/>
          </linearGradient>
          <linearGradient id="gloss" x1="100" y1="45" x2="924" y2="979" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#c6cae8"/>
          </linearGradient>
          <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="18" floodColor="#0d20a8" floodOpacity="0.32"/>
          </filter>
        </defs>
        <rect x="0" y="0" width="1024" height="1024" rx="210" ry="210" fill="url(#bgGrad)"/>
        {/* c */}
        <path d="M 404.9 368.1 A 150 150 0 1 1 404.9 195.9"
          fill="none" stroke="url(#gloss)" strokeWidth="174" strokeLinecap="round" filter="url(#sh)"/>
        {/* o top-right */}
        <circle cx="741.9" cy="282" r="150"
          fill="none" stroke="url(#gloss)" strokeWidth="174" filter="url(#sh)"/>
        {/* v */}
        <path d="M 142 582 L 272 912 L 432 552"
          fill="none" stroke="url(#gloss)" strokeWidth="174" strokeLinecap="round" strokeLinejoin="round" filter="url(#sh)"/>
        {/* o bottom-right */}
        <circle cx="741.9" cy="742" r="150"
          fill="none" stroke="url(#gloss)" strokeWidth="174" filter="url(#sh)"/>
      </svg>

      {/* Tagline */}
      <p style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 500,
        fontSize: 17,
        color: "rgba(255,255,255,0.82)",
        letterSpacing: 0.2,
        margin: 0,
        marginBottom: 64,
      }}>
        Start the covo.
      </p>

      {/* Buttons */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
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
            height: 58,
            border: "none",
            borderRadius: 16,
            background: "#ffffff",
            color: "#2563eb",
            fontFamily: "'Bricolage Grotesque', sans-serif",
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
            height: 58,
            border: "2px solid rgba(255,255,255,0.7)",
            borderRadius: 16,
            background: "transparent",
            color: "#ffffff",
            fontFamily: "'Bricolage Grotesque', sans-serif",
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
