import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { EditorShell } from "@/components/editor/editor-shell";

export default async function EditorPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <EditorShell />;
}
