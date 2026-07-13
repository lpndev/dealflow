import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode";

const AUTH_ROOT = process.env.WA_AUTH_DIR ?? "wa-auth";
const logger = pino({ level: "silent" });

type Session = {
  sock?: WASocket;
  qr?: string;
  qrCache?: { qr: string; dataUrl: string };
  connection: "connecting" | "open" | "close";
  desired: "up" | "down";
};

const sessions = new Map<string, Session>();
let versionPromise: ReturnType<typeof fetchLatestBaileysVersion> | undefined;

async function baileysVersion() {
  versionPromise ??= fetchLatestBaileysVersion();
  return (await versionPromise).version;
}

const authDir = (id: string) => path.join(AUTH_ROOT, id);

function session(id: string): Session {
  let s = sessions.get(id);
  if (!s) {
    s = { connection: "close", desired: "down" };
    sessions.set(id, s);
  }
  return s;
}

export async function listStoredSessions(): Promise<string[]> {
  if (!existsSync(AUTH_ROOT)) return [];
  const entries = await readdir(AUTH_ROOT, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function adoptLegacySession(id: string): Promise<void> {
  if (existsSync(authDir(id))) return;
  if (!existsSync(path.join(AUTH_ROOT, "creds.json"))) return;
  await mkdir(authDir(id), { recursive: true });
  const entries = await readdir(AUTH_ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    await rename(
      path.join(AUTH_ROOT, entry.name),
      path.join(authDir(id), entry.name),
    );
  }
}

export async function connect(id: string): Promise<void> {
  const s = session(id);
  s.desired = "up";
  await adoptLegacySession(id);
  const { state, saveCreds } = await useMultiFileAuthState(authDir(id));
  const sock = makeWASocket({
    auth: state,
    version: await baileysVersion(),
    browser: Browsers.ubuntu("Chrome"),
    logger,
  });
  s.sock = sock;

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    if (update.qr) s.qr = update.qr;
    if (update.connection) s.connection = update.connection;
    if (update.connection === "open") s.qr = undefined;
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as Boom)?.output?.statusCode;
      if (s.desired === "up" && code !== DisconnectReason.loggedOut)
        void connect(id);
    }
  });
}

export async function reconnect(id: string): Promise<void> {
  if (session(id).connection === "open") return;
  await connect(id);
}

export function endConnection(id: string): void {
  const s = session(id);
  s.desired = "down";
  s.sock?.end(undefined);
  s.sock = undefined;
  s.qr = undefined;
  s.connection = "close";
}

export async function logout(id: string): Promise<void> {
  const s = session(id);
  s.desired = "down";
  try {
    await s.sock?.logout();
  } catch {
    /* already gone — still clear local session */
  }
  s.sock = undefined;
  s.qr = undefined;
  s.connection = "close";
  await rm(authDir(id), { recursive: true, force: true });
}

export function getSession(id: string) {
  const s = sessions.get(id);
  return { connection: s?.connection ?? "close", hasQr: s?.qr !== undefined };
}

export async function getQrDataUrl(id: string): Promise<string | undefined> {
  const s = sessions.get(id);
  if (!s?.qr) return undefined;
  if (s.qrCache?.qr !== s.qr) {
    s.qrCache = { qr: s.qr, dataUrl: await qrcode.toDataURL(s.qr) };
  }
  return s.qrCache.dataUrl;
}

export async function listGroups(
  id: string,
): Promise<{ id: string; name: string }[]> {
  const { sock } = session(id);
  if (!sock) throw new Error("not connected");
  const all = await sock.groupFetchAllParticipating();
  return Object.values(all).map((g) => ({ id: g.id, name: g.subject }));
}

export async function sendMessage(
  id: string,
  to: string,
  content: string,
  imageUrl?: string,
): Promise<{ externalMessageId: string }> {
  const { sock } = session(id);
  if (!sock) throw new Error("not connected");
  const result = await sock.sendMessage(
    to,
    imageUrl
      ? { image: { url: imageUrl }, caption: content }
      : { text: content },
  );
  return { externalMessageId: result?.key?.id ?? "" };
}
