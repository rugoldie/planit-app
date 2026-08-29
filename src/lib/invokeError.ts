// supabase.functions.invoke() throws a FunctionsHttpError for any non-2xx
// response and returns `data: null` - the edge function's own JSON error
// body is never placed on `data`, only on `error.context` (the raw,
// unread Response). Without this, any specific message an edge function
// returns is invisible and callers only ever see a generic fallback string.
export const extractInvokeErrorMessage = async (fnError: unknown, fallback: string): Promise<string> => {
  const context = (fnError as { context?: Response } | null)?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) return body.error;
    } catch {
      // response body wasn't JSON or already consumed - fall through
    }
  }
  return fallback;
};
