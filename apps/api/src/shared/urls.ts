const TRAILING = new Set([".", ",", ";", ":", ")", "]", "}", ">", '"', "'"]);

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/\S+/g) ?? [];
  return matches.map((url) => {
    let end = url.length;
    while (end > 0 && TRAILING.has(url[end - 1])) end--;
    return url.slice(0, end);
  });
}

export function normalizeUrl(url: string): string {
  const parsed = new URL(url.trim());
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
