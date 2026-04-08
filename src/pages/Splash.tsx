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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="flex flex-col items-center mt-32">
        <h1 className="text-7xl font-extrabold text-foreground tracking-tight">planit</h1>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs mx-auto flex-1 justify-center">
        <button
          onClick={() => navigate("/login")}
          className="bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-lg font-bold border border-border"
        >
          Log in
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-lg font-bold"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Splash;
