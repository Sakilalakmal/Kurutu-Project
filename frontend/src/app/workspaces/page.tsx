import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { WorkspacesPageClient } from "@/components/workspace/workspaces-page-client";

export default async function WorkspacesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login?callbackUrl=%2Fworkspaces");
  }

  return <WorkspacesPageClient />;
}