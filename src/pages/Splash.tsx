import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import CovoWordmark from "@/components/CovoWordmark";

const Splash = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Only skip the splash screen for a fully onboarded user (username set).
    // Otherwise an incomplete/abandoned signup session would silently bounce
    // straight through to /home -> /onboarding instead of showing Splash.
    if (!loading && user && profile?.username) {
      navigate("/home");
    }
  }, [user, profile, loading, navigate]);

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

      {/* Covo logo — scales to fill most of the screen width */}
      <CovoWordmark />

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
          onClick={() => navigate("/onboarding")}
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

        {/* Privacy notice */}
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontFamily: "'Fredoka', sans-serif",
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          By signing up, you agree to our{" "}
          <Link to="/privacy" style={{ color: "#ffffff", fontWeight: 700, textDecoration: "underline" }}>
            Privacy Policy
          </Link>
        </p>

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
