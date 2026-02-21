import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { InviteJoinClient } from "@/components/workspace/invite-join-client";

const resolveParams = async (
  paramsInput: Promise<{ token: string }> | { token: string }
) => {
  const params = await paramsInput;

  return params.token;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const token = await resolveParams(params);
  const session = await getServerSession();

  if (!session) {
    const callbackUrl = encodeURIComponent(`/invite/${token}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  return <InviteJoinClient token={token} />;
}