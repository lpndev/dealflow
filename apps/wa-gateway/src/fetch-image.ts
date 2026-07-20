import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 3

function isPublicV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number)
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a >= 224) return false
  return true
}

function isPublicV6(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapped) return isPublicV4(mapped[1])
  const firstGroup = Number.parseInt(ip.split(":")[0] || "0", 16)
  return firstGroup >= 0x2000 && firstGroup <= 0x3fff
}

export function isPublicIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return isPublicV4(ip)
  if (version === 6) return isPublicV6(ip)
  return false
}

async function assertPublicHost(hostname: string): Promise<void> {
  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((a) => a.address)
  if (addresses.length === 0 || !addresses.every(isPublicIp)) {
    throw new Error("image host is not public")
  }
}

async function readCapped(res: Response): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? 0)
  if (declared > MAX_IMAGE_BYTES) throw new Error("image too large")
  if (!res.body) throw new Error("empty image response")
  const chunks: Uint8Array[] = []
  let total = 0
  for await (const chunk of res.body as ReadableStream<Uint8Array>) {
    total += chunk.byteLength
    if (total > MAX_IMAGE_BYTES) throw new Error("image too large")
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function fetchPublicImage(url: string): Promise<Buffer> {
  let current = url
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const parsed = new URL(current)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("image url must be http(s)")
    }
    await assertPublicHost(parsed.hostname)
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000)
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) throw new Error("image redirect without location")
      current = new URL(location, current).toString()
      continue
    }
    if (!res.ok) throw new Error(`image responded ${res.status}`)
    return readCapped(res)
  }
  throw new Error("too many image redirects")
}
