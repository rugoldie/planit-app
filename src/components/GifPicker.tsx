import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

type GifResult = {
  id: string;
  previewUrl: string;
  fullUrl: string;
  title: string;
};

const parseGifs = (data: any[]): GifResult[] =>
  (data || [])
    .map((g) => ({
      id: g.id,
      previewUrl: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url,
      fullUrl: g.images?.fixed_width?.url || g.images?.original?.url,
      title: g.title || "GIF",
    }))
    .filter((g) => g.previewUrl && g.fullUrl);

// Panel opens positioned above the message input (its parent must be
// `position: relative`) - a search bar, a grid of results (trending by
// default, GIPHY search once the user types), and the required attribution.
const GifPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) => {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!GIPHY_API_KEY) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = query.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=24&rating=pg-13`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`;
        const res = await fetch(url);
        const json = await res.json();
        setGifs(parseGifs(json.data));
      } catch (err) {
        console.error("GifPicker: fetch failed:", err);
        setGifs([]);
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
        {!GIPHY_API_KEY ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            GIF picker isn't configured — missing VITE_GIPHY_API_KEY.
          </p>
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
