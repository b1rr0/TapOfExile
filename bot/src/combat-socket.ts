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
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

/** Wait for the socket to be connected. Resolves immediately if already connected. */
export function waitForConnection(sock: Socket, timeoutMs = 8000): Promise<void> {
  if (sock.connected) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sock.off("connect", onConnect);
      sock.off("connect_error", onError);
      reject(new Error("Socket connection timeout"));
    }, timeoutMs);

    const onConnect = () => {
      clearTimeout(timeout);
      sock.off("connect_error", onError);
      resolve();
    };

    const onError = (err: Error) => {
      clearTimeout(timeout);
      sock.off("connect", onConnect);
      reject(new Error(`Socket connection failed: ${err.message}`));
    };

    sock.once("connect", onConnect);
    sock.once("connect_error", onError);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
