import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <main className="min-h-screen bg-[#07070b]" aria-label="Home page shell" />;
}
