import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Public Supabase client config (project URL + publishable anon key).
// These are safe to ship in the browser bundle — RLS protects the data.
// Used as a fallback so production/publish builds work even when the
// gitignored .env file is not present at build time.
const PUBLIC_SUPABASE_DEFAULTS = {
  VITE_SUPABASE_PROJECT_ID: "vugjjbtmcwfycqoykfgz",
  VITE_SUPABASE_URL: "https://vugjjbtmcwfycqoykfgz.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Z2pqYnRtY3dmeWNxb3lrZmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTg3NjUsImV4cCI6MjA5MTE5NDc2NX0.jjJJTjFqENLPmWHSkwbE-9OCZE6ICOzQHMzwTt7jSf0",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const define: Record<string, string> = {};
  for (const [key, fallback] of Object.entries(PUBLIC_SUPABASE_DEFAULTS)) {
    define[`import.meta.env.${key}`] = JSON.stringify(env[key] || fallback);
  }
  return {
  define,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  };
});
