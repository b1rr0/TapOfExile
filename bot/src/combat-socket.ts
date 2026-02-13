/**
 * Socket.IO client for combat WebSocket connection.
 *
 * Singleton — one connection per session, shared across CombatManager lifecycle.
 */
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api.js";

const WS_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function getSocket(): Socket {
  // Reuse if already connected OR still connecting
  if (socket && (socket.connected || socket.active)) return socket;

  // Clean up dead socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  const token = getAccessToken();

  socket = io(`${WS_URL}/combat`, {
    auth: { token },
    transports: ["polling", "websocket"],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  return socket;
}

/**
 * Start connecting early (before CombatScene mounts).
 * If already connected or connecting, this is a no-op.
 * CombatManager.getSocket() will reuse the same instance.
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

    // Don't reject on individual connect_error — Socket.IO will retry
    // automatically (reconnection: true). Only the timeout rejects.

    const cleanup = () => {
      clearTimeout(timeout);
      sock.off("connect", onConnect);
    };

    sock.on("connect", onConnect);
  });
}

