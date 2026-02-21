import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { EditorShell } from "@/components/editor/editor-shell";

export default async function EditorPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ diagramId?: string; workspaceId?: string }>
    | { diagramId?: string; workspaceId?: string };
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedDiagramId = resolvedSearchParams.diagramId?.trim() || null;
  const requestedWorkspaceId = resolvedSearchParams.workspaceId?.trim() || null;

  return (
    <EditorShell
      initialDiagramId={requestedDiagramId}
      initialWorkspaceId={requestedWorkspaceId}
    />
  );
}
