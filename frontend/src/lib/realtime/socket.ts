"use client";

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/realtime/events";

let socketSingleton: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getRealtimeSocket = () => {
  if (typeof window === "undefined") {
    throw new Error("Realtime socket is only available in the browser.");
  }

  if (!socketSingleton) {
    socketSingleton = io({
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  return socketSingleton;
};
