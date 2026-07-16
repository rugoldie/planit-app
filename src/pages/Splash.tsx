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

      {/* Covo logo — wide horizontal layout */}
      <img
        src="/covo-icon.png"
        alt="Covo"
        style={{
          width: "88vw",
          maxWidth: 380,
          height: "auto",
          marginBottom: 24,
          borderRadius: "20.5%",
        }}
      />

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
