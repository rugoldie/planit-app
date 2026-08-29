import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractInvokeErrorMessage } from "@/lib/invokeError";

type GifResult = {
  id: string;
  previewUrl: string;
  fullUrl: string;
  title: string;
};

// Panel opens positioned above the message input (its parent must be
// `position: relative`) - a search bar, a grid of results (trending by
// default, GIPHY search once the user types), and the required attribution.
// The GIPHY API key lives server-side in the giphy-proxy edge function
// (Vite VITE_ env vars are build-time only and end up in the client bundle,
// which isn't safe for a real API key).
const GifPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      const { data, error: fnError } = await supabase.functions.invoke("giphy-proxy", {
        body: { query: query.trim() },
      });
      if (fnError || data?.error) {
        setError(data?.error || (await extractInvokeErrorMessage(fnError, "Couldn't load GIFs")));
        setGifs([]);
      } else {
        setGifs(data?.gifs || []);
      }
      setLoading(false);
    }, query.trim() ? 400 : 0);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div
      className="absolute left-0 right-0 bottom-full flex flex-col z-10"
      style={{ height: 320, backgroundColor: "#1a1a1a", borderTop: "1px solid rgba(255,255,255,0.08)", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIPHY..."
            className="w-full rounded-full pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
            style={{ backgroundColor: "#2a2a2a" }}
          />
        </div>
        <button type="button" onClick={onClose} className="shrink-0">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {error ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">{error}</p>
        ) : loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">Loading GIFs...</p>
        ) : gifs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 pb-2">
            {gifs.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelect(g.fullUrl)}
                className="rounded-lg overflow-hidden aspect-square bg-secondary"
              >
                <img src={g.previewUrl} alt={g.title} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <p
        className="text-center text-[10px] text-muted-foreground py-2 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        Powered by GIPHY
      </p>
    </div>
  );
};

export default GifPicker;
