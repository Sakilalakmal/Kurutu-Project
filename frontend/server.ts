import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "./src/lib/realtime/events";
import { registerRealtimeHandlers } from "./src/server/realtime/register";
import type { RealtimeSocketData } from "./src/server/realtime/types";

const dev = (process.env.NODE_ENV ?? "development") !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const requestHandler = app.getRequestHandler();

void app
  .prepare()
  .then(() => {
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
