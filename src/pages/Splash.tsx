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

      {/* Covo icon PNG — flat #2563eb background matching the page, centred */}
      <img
        src="/covo-splash-logo.png"
        alt="Covo"
        style={{
          width: "78vw",
          maxWidth: 400,
          height: "auto",
        }}
      />

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
            height: 56,
            border: "2px solid rgba(255,255,255,0.6)",
            borderRadius: 999,
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
