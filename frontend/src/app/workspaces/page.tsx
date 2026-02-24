import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { WorkspacesPageSkeleton } from "@/components/workspace/workspaces-page-skeleton";
import { WorkspacesPageClient } from "@/components/workspace/workspaces-page-client";
import { listWorkspaceCardsForUser } from "@/lib/workspace/server";

async function WorkspacesContent({ userId }: { userId: string }) {
  const initialWorkspaces = await listWorkspaceCardsForUser(userId);

  return <WorkspacesPageClient initialWorkspaces={initialWorkspaces} />;
}

export default async function WorkspacesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fworkspaces");
  }

  return (
    <Suspense fallback={<WorkspacesPageSkeleton />}>
      <WorkspacesContent userId={session.user.id} />
    </Suspense>
  );
}
