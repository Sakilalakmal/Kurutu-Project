import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "../../lib/realtime/events";

export type RealtimeSocketData = {
  userId: string;
  name: string;
  image: string | null;
  workspaceId: string | null;
  diagramId: string | null;
  threadId: string | null;
};

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;

export type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;
