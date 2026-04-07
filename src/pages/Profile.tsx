import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const raw = localStorage.getItem("planit_user");
  const user = raw ? JSON.parse(raw) : { name: "User", events: [] };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      <button onClick={() => navigate("/home")} className="self-start mb-6">
        <ArrowLeft className="w-7 h-7 text-foreground" />
      </button>

      <h1 className="text-3xl font-bold text-foreground mb-8">{user.name}</h1>

      <h2 className="text-lg font-semibold text-foreground mb-4">Your Events</h2>

      {user.events && user.events.length > 0 ? (
        <div className="flex flex-col gap-3">
          {user.events.map((event: { name: string; date: string }, i: number) => (
            <div
              key={i}
              className="bg-card text-card-foreground rounded-[var(--radius)] px-5 py-4 shadow-sm"
            >
              <p className="font-bold text-lg">{event.name}</p>
              <p className="text-muted-foreground text-sm">{event.date}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card text-muted-foreground rounded-[var(--radius)] px-5 py-4 shadow-sm text-center">
          No events yet
        </div>
      )}
    </div>
  );
};

export default Profile;
