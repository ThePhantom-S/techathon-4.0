/**
 * Safely parses JSON from a fetch Response.
 * Protects against HTML error pages (e.g. Vercel 500/504) or truncated responses
 * throwing "SyntaxError: Unexpected token 'A', 'A server e'... is not valid JSON".
 */
export async function safeParseJson<T = any>(res: Response, fallback?: T): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return (fallback ?? ({} as T)) as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return (fallback ?? {
        error: `Server responded with status ${res.status}: ${text.slice(0, 150).replace(/\s+/g, ' ').trim()}`,
        isNonJson: true,
      }) as unknown as T;
    }
  } catch (err: any) {
    return (fallback ?? {
      error: err?.message || 'Network error while parsing response',
      isNonJson: true,
    }) as unknown as T;
  }
}
