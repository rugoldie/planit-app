import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render-time exceptions in its subtree and shows a recoverable
 * screen instead of letting React tear the whole app down to a blank white
 * page. Shows the actual error message so a report back ("it said: ...") is
 * enough to diagnose, rather than just "the screen went blank."
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4"
          style={{ backgroundColor: "#0a0a0a" }}
        >
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>Something went wrong displaying this page</p>
          <p className="break-words" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, maxWidth: 320 }}>
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-full px-5 py-2.5 text-sm font-bold"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/home")}
              className="rounded-full px-5 py-2.5 text-sm font-bold"
              style={{ background: "#2563eb", color: "#fff", border: "none" }}
            >
              Go home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
