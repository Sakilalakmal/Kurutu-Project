import type { Socket } from "socket.io";
import { auth } from "../../app/lib/auth";

export type AuthenticatedSocketUser = {
  userId: string;
  name: string;
  image: string | null;
};

const toHeaderValue = (value: string | string[] | undefined) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

export const resolveSocketUser = async (socket: Socket) => {
  const cookie = toHeaderValue(socket.handshake.headers.cookie);

  if (!cookie) {
    return null;
  }

  const headers = new Headers();
  headers.set("cookie", cookie);

  const host = toHeaderValue(socket.handshake.headers.host);

  if (host) {
    headers.set("host", host);
  }

  const xForwardedProto = toHeaderValue(socket.handshake.headers["x-forwarded-proto"]);

  if (xForwardedProto) {
    headers.set("x-forwarded-proto", xForwardedProto);
  }

  const xForwardedFor = toHeaderValue(socket.handshake.headers["x-forwarded-for"]);

  if (xForwardedFor) {
    headers.set("x-forwarded-for", xForwardedFor);
  }

  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: session.user.id,
    name: session.user.name?.trim() || "User",
    image: session.user.image ?? null,
  } satisfies AuthenticatedSocketUser;
};
