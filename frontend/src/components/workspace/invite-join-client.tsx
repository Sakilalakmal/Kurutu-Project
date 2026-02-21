"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import {
  joinWorkspaceInvite,
  previewInviteToken,
  type InvitePreview,
} from "@/lib/workspace/api";
import { WORKSPACE_STORAGE_KEY } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InviteJoinClientProps = {
  token: string;
};

export function InviteJoinClient({ token }: InviteJoinClientProps) {
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const loadInvite = async () => {
      try {
        const result = await previewInviteToken(token);

        if (!cancelled) {
          setInvite(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load invite.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleJoin = async () => {
    setIsJoining(true);

    try {
      const result = await joinWorkspaceInvite(token);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, result.workspaceId);
      }

      toast.success(result.alreadyMember ? "Already a member." : "Joined workspace.");
      router.push(`/editor?workspaceId=${result.workspaceId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join workspace.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspace invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-zinc-500">Loading invite...</p> : null}

          {!isLoading && errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          {!isLoading && invite ? (
            <>
              <div className="space-y-1 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <p>
                  Workspace: <span className="font-medium">{invite.workspaceName}</span>
                </p>
                <p>
                  Role: <span className="font-medium">{invite.role}</span>
                </p>
                <p>
                  Expires:{" "}
                  <span className="font-medium">
                    {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "Never"}
                  </span>
                </p>
              </div>
              <Button onClick={() => void handleJoin()} disabled={isJoining} className="w-full">
                {isJoining ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Join workspace
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}