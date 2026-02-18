import { redirect } from "next/navigation";
import { getServerSession } from "@/app/lib/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { BentoPreview } from "@/components/auth/bento-preview";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/home");
  }

  return (
    <main className="min-h-screen bg-[#2f303a] p-2 text-zinc-100 sm:p-4">
      <div className="mx-auto max-w-[1380px] overflow-hidden rounded-2xl border border-[#3a3c47] bg-[#050507] shadow-[0_35px_120px_-50px_rgba(0,0,0,0.9)]">
        <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-[#111216] px-4">
          <span className="size-2 rounded-full bg-[#fd5f57]" />
          <span className="size-2 rounded-full bg-[#febc2e]" />
          <span className="size-2 rounded-full bg-[#2ac93f]" />
          <span className="mx-auto text-[10px] tracking-wide text-zinc-500">kurutu.app/login</span>
        </div>
        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-6 motion-safe:duration-700">
            <BentoPreview />
          </section>
          <section className="flex items-center justify-center p-8 sm:p-10 lg:p-14 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-6 motion-safe:duration-700">
            <AuthCard />
          </section>
        </div>
      </div>
    </main>
  );
}
