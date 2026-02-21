import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { WorkspaceSettingsClient } from "@/components/workspace/workspace-settings-client";

const resolveParams = async (
  paramsInput: Promise<{ workspaceId: string }> | { workspaceId: string }
) => {
  const params = await paramsInput;

  return params.workspaceId;
};

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }> | { workspaceId: string };
}) {
  const session = await getServerSession();
  const workspaceId = await resolveParams(params);

  if (!session) {
    const callbackUrl = encodeURIComponent(`/workspaces/${workspaceId}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return <WorkspaceSettingsClient workspaceId={workspaceId} />;
}