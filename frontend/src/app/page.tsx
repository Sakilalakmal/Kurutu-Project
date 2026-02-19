import { getServerSession } from "@/app/lib/auth";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const session = await getServerSession();
  const ctaHref = session ? "/editor" : "/login";

  return <LandingPage ctaHref={ctaHref} ctaLabel="Start Drawing" />;
}
