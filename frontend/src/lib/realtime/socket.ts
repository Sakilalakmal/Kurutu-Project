"use client";

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/realtime/events";

let socketSingleton: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let hasRegisteredDevLogs = false;

const registerDevLogs = (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
  if (process.env.NODE_ENV !== "development" || hasRegisteredDevLogs) {
    return;
  }

  socket.on("connect", () => {
    console.log("realtime socket connected", socket.id);
  });
  socket.on("connect_error", (error) => {
    console.log("realtime socket connect_error", error.message);
  });

  hasRegisteredDevLogs = true;
};

export const getSocket = () => {
  if (typeof window === "undefined") {
    throw new Error("Realtime socket is only available in the browser.");
  }

  if (!socketSingleton) {
    socketSingleton = io({
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    registerDevLogs(socketSingleton);
  }

  return socketSingleton;
};

export const getRealtimeSocket = getSocket;
