import { randomBytes } from "node:crypto";
import type { InviteExpiryOption } from "@/lib/workspace/types";

type InviteValidationRecord = {
  revokedAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usesCount: number;
};

export const createWorkspaceInviteToken = () =>
  randomBytes(24).toString("base64url");

export const resolveInviteExpiryDate = (
  expiry: InviteExpiryOption | undefined,
  now = new Date()
) => {
  if (expiry === "never") {
    return null;
  }

  const days = expiry === "30" ? 30 : 7;
  const expiresAt = new Date(now);

  expiresAt.setDate(expiresAt.getDate() + days);

  return expiresAt;
};

export const getInviteValidationError = (
  invite: InviteValidationRecord,
  now = new Date()
) => {
  if (invite.revokedAt) {
    return "This invite is no longer active.";
  }

  if (invite.expiresAt && invite.expiresAt <= now) {
    return "This invite has expired.";
  }

  if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
    return "This invite has reached its usage limit.";
  }

  return null;
};