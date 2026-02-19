import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type ArtTokenKind = "semicircle" | "split" | "orbit" | "frame";
export type ArtTone = "coral" | "teal" | "sun" | "ink";

type ArtTokenProps = {
  kind: ArtTokenKind;
  tone?: ArtTone;
  className?: string;
  floating?: boolean;
};

const toneMap: Record<ArtTone, { a: string; b: string; c: string }> = {
  coral: { a: "#ff7b4d", b: "#ffb168", c: "#1f2937" },
  teal: { a: "#76c7bc", b: "#b6ece3", c: "#1f2937" },
  sun: { a: "#ffb548", b: "#ffd892", c: "#2f241a" },
  ink: { a: "#202533", b: "#4e556e", c: "#f3efe8" },
};

const toVars = (tone: ArtTone): CSSProperties => {
  const palette = toneMap[tone];
  return {
    "--landing-tone-a": palette.a,
    "--landing-tone-b": palette.b,
    "--landing-tone-c": palette.c,
  } as CSSProperties;
};

function SemicircleToken() {
  return (
    <>
      <span className="absolute -top-7 -left-7 h-24 w-24 rounded-full bg-[var(--landing-tone-a)]" />
      <span className="absolute bottom-0 right-0 h-20 w-20 rounded-tl-full bg-[var(--landing-tone-b)]" />
      <span className="absolute bottom-4 left-4 h-9 w-9 rounded-full border border-[var(--landing-tone-c)]/40" />
    </>
  );
}

function SplitToken() {
  return (
    <>
      <span className="absolute inset-y-0 left-0 w-1/2 bg-[var(--landing-tone-a)]/85" />
      <span className="absolute inset-y-0 right-0 w-1/2 bg-[var(--landing-tone-b)]/90" />
      <span className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--landing-tone-c)]/40 bg-[var(--landing-card)]" />
    </>
  );
}

function OrbitToken() {
  return (
    <>
      <span className="absolute inset-2 rounded-full border border-[var(--landing-tone-c)]/25" />
      <span className="absolute inset-5 rounded-full border border-dashed border-[var(--landing-tone-c)]/35" />
      <span className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--landing-tone-a)]" />
      <span className="absolute top-2 right-3 h-3 w-3 rounded-full bg-[var(--landing-tone-b)]" />
    </>
  );
}

function FrameToken() {
  return (
    <>
      <span className="absolute top-2 left-2 h-7 w-7 border-t border-l border-[var(--landing-tone-c)]/45" />
      <span className="absolute top-2 right-2 h-7 w-7 border-t border-r border-[var(--landing-tone-c)]/45" />
      <span className="absolute bottom-2 left-2 h-7 w-7 border-b border-l border-[var(--landing-tone-c)]/45" />
      <span className="absolute right-2 bottom-2 h-7 w-7 border-r border-b border-[var(--landing-tone-c)]/45" />
      <span className="absolute inset-[30%] rounded-full bg-[var(--landing-tone-a)]/60" />
    </>
  );
}

export function ArtToken({ kind, tone = "coral", className, floating = true }: ArtTokenProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--landing-line)]/90 bg-[var(--landing-card)] shadow-[0_18px_40px_-30px_rgba(13,19,33,0.7)]",
        floating && "landing-float",
        className
      )}
      style={toVars(tone)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.68),transparent_52%)]" />
      {kind === "semicircle" ? <SemicircleToken /> : null}
      {kind === "split" ? <SplitToken /> : null}
      {kind === "orbit" ? <OrbitToken /> : null}
      {kind === "frame" ? <FrameToken /> : null}
    </div>
  );
}
