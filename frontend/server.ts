import { createServer } from "node:http";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "./src/lib/realtime/events";
import type { RealtimeSocketData } from "./src/server/realtime/types";

const dev = (process.env.NODE_ENV ?? "development") !== "production";
loadEnvConfig(process.cwd(), dev);

const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const requestHandler = app.getRequestHandler();

void app
  .prepare()
  .then(async () => {
    const { registerRealtimeHandlers } = await import("./src/server/realtime/register");

    const httpServer = createServer((request, response) => {
      void requestHandler(request, response);
    });

    const io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      RealtimeSocketData
    >(httpServer, {
      path: "/socket.io",
      cors: {
        origin: true,
        credentials: true,
      },
    });

    registerRealtimeHandlers(io);

    httpServer.listen(port, hostname, () => {
      process.stdout.write(
        `> Realtime server ready on http://${hostname}:${String(port)}\n`
      );
    });
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
