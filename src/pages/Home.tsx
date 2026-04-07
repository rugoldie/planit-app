import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button
        onClick={() => navigate("/profile")}
        className="self-start bg-card rounded-full w-11 h-11 flex items-center justify-center shadow-sm"
      >
        <User className="w-5 h-5 text-card-foreground" />
      </button>

      <div className="flex flex-col items-center mt-8">
        <h1 className="text-7xl font-extrabold text-foreground tracking-tight">planit</h1>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 gap-12 px-2">
        <button
          onClick={() => navigate("/host")}
          className="w-full max-w-md bg-card text-card-foreground rounded-[var(--radius)] py-10 text-3xl font-extrabold shadow-sm"
        >
          Host
        </button>
        <button
          onClick={() => {}}
          className="w-full max-w-md bg-card text-card-foreground rounded-[var(--radius)] py-10 text-3xl font-extrabold shadow-sm"
        >
          Join
        </button>
      </div>
    </div>
  );
};

export default Home;
