import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

const SkeletonCard = () => (
  <Card className="gap-0 border-border/60 py-0">
    <CardHeader className="space-y-3 px-5 py-5">
      <div className="h-6 w-3/5 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
      <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
    </CardHeader>
    <CardContent className="space-y-3 border-y border-border/60 px-5 py-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 animate-pulse rounded-md bg-muted" />
        <div className="h-8 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-6 w-1/2 animate-pulse rounded-md bg-muted" />
      <div className="h-3 w-full animate-pulse rounded-md bg-muted" />
    </CardContent>
    <CardFooter className="justify-between gap-3 px-5 py-4">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
    </CardFooter>
  </Card>
);

export function WorkspacesPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      </header>
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    </main>
  );
}
