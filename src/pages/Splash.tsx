import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="flex flex-col items-center mb-16">
        <h1 className="text-5xl font-extrabold text-foreground tracking-tight">planit</h1>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => navigate("/home")}
          className="bg-card text-card-foreground rounded-[var(--radius)] py-4 text-lg font-bold shadow-sm"
        >
          Log in
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="bg-card text-card-foreground rounded-[var(--radius)] py-4 text-lg font-bold shadow-sm"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default Splash;
