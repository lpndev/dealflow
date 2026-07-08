export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g) ?? [];
  return matches.map((url) => url.replace(/[.,;:)\]}>"']+$/, ""));
}

export function normalizeUrl(url: string): string {
  const parsed = new URL(url.trim());
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
