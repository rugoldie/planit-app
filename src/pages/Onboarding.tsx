import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ACCENT = "#aaee44";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  // Pre-fill name from existing profile
  useEffect(() => {
    if (profile?.name) setFullName(profile.name);
  }, [profile]);

  // If already onboarded, go home
  useEffect(() => {
    if (!loading && profile?.username) navigate("/home", { replace: true });
  }, [loading, profile, navigate]);

  // Username availability check with debounce
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username" as any, username)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setAvatarPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      console.log("Avatar uploaded:", data.publicUrl);
    } else {
      console.error("Avatar upload error:", JSON.stringify(error));
      toast.error(`Photo upload failed: ${error.message} — check that the "avatars" storage bucket exists in Supabase`);
    }
    setUploading(false);
  };

  const canNext = () => {
    if (step === 0) return fullName.trim().length > 0;
    if (step === 1) return usernameStatus === "available" && username.length >= 3;
    return true;
  };

  const handleNext = async () => {
    setSaveError(null);
    if (step < 2) { setStep(step + 1); return; }
    await save(true);
  };

  const save = async (withAvatar: boolean) => {
    if (!user) {
      setSaveError("Not logged in — please restart the app.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      // Build update payload — avatar only if upload succeeded
      const update: Record<string, any> = { name: fullName.trim() };
      if (username) update.username = username;
      if (withAvatar && avatarUrl) update.avatar_url = avatarUrl;

      console.log("Onboarding save: payload", update, "user_id", user.id);

      const { error, data } = await supabase
        .from("profiles")
        .update(update)
        .eq("user_id", user.id)
        .select();

      console.log("Onboarding save: result", { error: error ? JSON.stringify(error) : null, data });

      if (error) {
        console.error("Onboarding save error:", error.code, error.message, error.details, error.hint);

        if (error.code === "PGRST204") {
          // username column doesn't exist yet — retry without it so the user isn't blocked
          console.warn("username column missing, retrying without it");
          const fallback: Record<string, any> = { name: fullName.trim() };
          if (withAvatar && avatarUrl) fallback.avatar_url = avatarUrl;
          const { error: err2 } = await supabase
            .from("profiles")
            .update(fallback)
            .eq("user_id", user.id);
          if (err2) {
            setSaveError(`Save failed: ${err2.message} (run the Supabase migrations)`);
            setSaving(false);
            return;
          }
          // Warn but still proceed so user isn't stuck
          toast.error("Username could not be saved — run the Supabase migration (ALTER TABLE profiles ADD COLUMN username text UNIQUE)");
        } else {
          setSaveError(`Save failed: ${error.message}`);
          setSaving(false);
          return;
        }
      }

      // Refresh profile — best-effort, don't let it block navigation
      try {
        await refreshProfile();
      } catch (e) {
        console.warn("refreshProfile failed (non-fatal):", e);
      }

      setSaving(false);
      navigate("/home", { replace: true });
    } catch (e: any) {
      console.error("Onboarding save threw:", e);
      setSaveError(e?.message ?? "Unexpected error — check the console.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </button>
        ) : <div className="w-6" />}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? "24px" : "8px",
                backgroundColor: i <= step ? ACCENT : "#333",
              }}
            />
          ))}
        </div>
        <div className="w-6" />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {step === 0 && (
          <div className="w-full max-w-xs mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-2">What's your full name?</h1>
            <p className="text-muted-foreground text-sm mb-6">This is how friends will see you</p>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              className="w-full bg-card text-foreground rounded-[var(--radius)] px-4 py-3.5 text-base outline-none placeholder:text-muted-foreground border border-border"
              style={{ borderColor: fullName.trim() ? ACCENT : undefined }}
            />
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-xs mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-2">Pick a username</h1>
            <p className="text-muted-foreground text-sm mb-6">Lowercase, numbers and underscores only</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold select-none">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                autoFocus
                maxLength={30}
                className="w-full bg-card text-foreground rounded-[var(--radius)] pl-8 pr-10 py-3.5 text-base outline-none placeholder:text-muted-foreground border border-border transition-colors"
                style={{
                  borderColor:
                    usernameStatus === "available" ? ACCENT :
                    usernameStatus === "taken" ? "#ef4444" : undefined,
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#333", borderTopColor: ACCENT }} />
                )}
                {usernameStatus === "available" && <Check className="w-4 h-4" style={{ color: ACCENT }} />}
                {usernameStatus === "taken" && <X className="w-4 h-4 text-destructive" />}
              </div>
            </div>
            {usernameStatus === "available" && (
              <p className="mt-2 text-xs font-semibold" style={{ color: ACCENT }}>@{username} is available!</p>
            )}
            {usernameStatus === "taken" && (
              <p className="mt-2 text-xs font-semibold text-destructive">@{username} is already taken</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center w-full max-w-xs mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-2 text-center">Add a profile photo</h1>
            <p className="text-muted-foreground text-sm mb-8 text-center">Optional — you can always change it later</p>
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden relative mb-6 border-2 border-dashed"
              style={{ borderColor: avatarPreview ? ACCENT : "#444" }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-2">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Tap to add photo</span>
                </div>
              )}
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </div>
        )}
      </div>

      {saveError && (
        <div className="mt-4 mx-auto w-full max-w-xs rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-red-400">{saveError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-6 max-w-xs mx-auto w-full">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext() || saving || uploading}
          className="w-full py-4 rounded-[var(--radius)] text-base font-bold disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: ACCENT, color: "#111" }}
        >
          {saving ? "Saving..." : step === 2 ? "Get started" : "Continue"}
        </button>
        {step === 2 && (
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="w-full py-3 text-muted-foreground text-sm font-medium"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
