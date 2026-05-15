import { createRoot } from "react-dom/client";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
// @ts-ignore
import "@fontsource/bebas-neue";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
