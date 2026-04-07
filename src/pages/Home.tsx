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

      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        <button
          onClick={() => {}}
          className="w-full max-w-xs bg-card text-card-foreground rounded-[var(--radius)] py-5 text-xl font-bold shadow-sm"
        >
          Host
        </button>
        <button
          onClick={() => {}}
          className="w-full max-w-xs bg-card text-card-foreground rounded-[var(--radius)] py-5 text-xl font-bold shadow-sm"
        >
          Join
        </button>
      </div>
    </div>
  );
};

export default Home;
