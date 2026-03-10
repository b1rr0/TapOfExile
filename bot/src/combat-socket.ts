/**
 * Socket.IO client for combat WebSocket connection.
 *
 * Singleton - one connection per session, shared across CombatManager lifecycle.
 */
import { io, Socket } from "socket.io-client";
import { getAccessToken, auth } from "./api.js";

const WS_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

let socket: Socket | null = null;

/**
 * Ensure we have a fresh access token before opening the socket.
 * JWT access tokens expire in 1 hour; if the player was in the hideout
 * or skill tree for a while, the token may have expired.
 */
async function ensureFreshToken(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadB64));
    const exp = payload.exp as number;
    const now = Date.now() / 1000;
    if (exp - now < 60) {
      const ok = await auth.refresh();
      if (ok) return getAccessToken();
    }
  } catch { /* non-critical */ }
  return getAccessToken();
}

/**
 * Get (or create) the shared combat socket.
 * ASYNC - may refresh the JWT before creating a new socket.
 */
export async function getSocket(): Promise<Socket> {
  if (socket && (socket.connected || socket.active)) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  const token = await ensureFreshToken();

  socket = io(`${WS_URL}/combat`, {
    auth: { token },
    // Start with WebSocket directly - skips HTTP polling handshake (saves 1-2 RTTs).
    // Falls back to polling only if WebSocket is unavailable (rare in Telegram webview).
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 5000,
  });

  return socket;
}

/**
 * Start connecting early (before CombatScene mounts).
 * If already connected or connecting, this is a no-op.
 */
export function preconnectSocket(): void {
  getSocket();
}

/** Wait for the socket to be connected. Resolves immediately if already connected. */
export function waitForConnection(sock: Socket, timeoutMs = 30000): Promise<void> {
  if (sock.connected) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connection timeout"));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      clearTimeout(timeout);
      sock.off("connect", onConnect);
    };

    sock.on("connect", onConnect);
  });
}
