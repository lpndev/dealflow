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

const AUTH_DIR = process.env.WA_AUTH_DIR ?? "wa-auth";
const logger = pino({ level: "silent" });

let sock: WASocket | undefined;
let currentQr: string | undefined;
let connection: "connecting" | "open" | "close" = "close";
let version:
  Awaited<ReturnType<typeof fetchLatestBaileysVersion>>["version"] | undefined;

export async function connect(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  if (!version) ({ version } = await fetchLatestBaileysVersion());
  sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.ubuntu("Chrome"),
    logger,
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    if (update.qr) currentQr = update.qr;
    if (update.connection) connection = update.connection;
    if (update.connection === "open") currentQr = undefined;
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as Boom)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) void connect();
    }
  });
}

export function getSession() {
  return { connection, hasQr: currentQr !== undefined };
}

export async function getQrDataUrl(): Promise<string | undefined> {
  return currentQr ? qrcode.toDataURL(currentQr) : undefined;
}

export async function listGroups(): Promise<{ id: string; name: string }[]> {
  if (!sock) throw new Error("not connected");
  const all = await sock.groupFetchAllParticipating();
  return Object.values(all).map((g) => ({ id: g.id, name: g.subject }));
}

export async function sendMessage(
  to: string,
  content: string,
  imageUrl?: string,
): Promise<{ externalMessageId: string }> {
  if (!sock) throw new Error("not connected");
  const result = await sock.sendMessage(
    to,
    imageUrl
      ? { image: { url: imageUrl }, caption: content }
      : { text: content },
  );
  return { externalMessageId: result?.key?.id ?? "" };
}
