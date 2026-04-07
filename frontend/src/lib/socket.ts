import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(accessToken?: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: accessToken ? { token: accessToken } : {},
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}
