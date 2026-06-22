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

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0d0e11",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 32px",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        left: "50%", top: "40%",
        width: 480, height: 480,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,.1) 0%, rgba(61,123,255,.06) 40%, transparent 64%)",
        pointerEvents: "none",
      }} />

      {/* Logo lockup */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 56, position: "relative", zIndex: 1 }}>
        {/* C-ring + lime dot */}
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 18 }}>
          {/* Gradient ring clipped to C shape */}
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            padding: "13px",
            background: "linear-gradient(150deg, #3D7BFF, #22D3EE)",
            clipPath: "polygon(0 0, 58% 0, 58% 25%, 100% 25%, 100% 75%, 58% 75%, 58% 100%, 0 100%)",
          }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0d0e11" }} />
          </div>
          {/* Lime dot */}
          <div style={{
            position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)",
            width: 13, height: 13, borderRadius: "50%",
            background: "#C6F24E",
            boxShadow: "0 0 12px rgba(198,242,78,.65)",
          }} />
        </div>

        {/* "covo" wordmark */}
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 800,
          fontSize: 72,
          letterSpacing: -4,
          lineHeight: 1,
          background: "linear-gradient(120deg, #3D7BFF, #22D3EE)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          covo
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320, position: "relative", zIndex: 1 }}>
        <button
          onClick={() => navigate("/login")}
          style={{
            height: 62,
            border: "none",
            borderRadius: 18,
            background: "#26272b",
            color: "#fff",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
        <button
          onClick={() => navigate("/signup")}
          style={{
            height: 62,
            border: "none",
            borderRadius: 18,
            background: "linear-gradient(120deg, #3D7BFF, #22D3EE)",
            color: "#06121f",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(34,150,238,.3)",
          }}
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Splash;
