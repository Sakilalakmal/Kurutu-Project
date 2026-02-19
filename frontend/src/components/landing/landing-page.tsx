"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Download,
  GitBranchPlus,
  Grid3X3,
  Layers3,
  LayoutTemplate,
  Save,
  Share2,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArtToken, type ArtTokenKind, type ArtTone } from "@/components/landing/landing-art";
import {
  capabilityPillars,
  outputFeatures,
  templateHighlights,
  workflowSteps,
} from "@/components/landing/landing-data";

export interface LandingPageProps {
  ctaHref: string;
  ctaLabel: string;
}

type HeroTokenConfig = {
  id: string;
  kind: ArtTokenKind;
  tone: ArtTone;
  className: string;
  enterX: number;
  enterY: number;
  enterRotate: number;
};

type ParallaxGroupProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
};

const revealViewport = { once: true, amount: 0.25 } as const;

const capabilityIcons = [StickyNote, GitBranchPlus, Grid3X3];
const workflowIcons = [Sparkles, GitBranchPlus, Layers3, Share2];
const templateIcons = [LayoutTemplate, LayoutTemplate];
const outputIcons = [Share2, Download, Save];

const heroTokens: HeroTokenConfig[] = [
  {
    id: "hero-token-1",
    kind: "semicircle",
    tone: "coral",
    className: "absolute -top-3 left-2 h-28 w-28 sm:h-32 sm:w-32",
    enterX: -80,
    enterY: -54,
    enterRotate: -14,
  },
  {
    id: "hero-token-2",
    kind: "orbit",
    tone: "teal",
    className: "absolute top-6 right-4 h-20 w-20 sm:h-24 sm:w-24",
    enterX: 88,
    enterY: -42,
    enterRotate: 18,
  },
  {
    id: "hero-token-3",
    kind: "split",
    tone: "sun",
    className: "absolute top-[30%] -left-3 h-24 w-24 sm:h-28 sm:w-28",
    enterX: -74,
    enterY: 12,
    enterRotate: -10,
  },
  {
    id: "hero-token-4",
    kind: "frame",
    tone: "ink",
    className: "absolute top-[36%] right-[12%] h-24 w-24 sm:h-28 sm:w-28",
    enterX: 48,
    enterY: -20,
    enterRotate: 16,
  },
  {
    id: "hero-token-5",
    kind: "semicircle",
    tone: "teal",
    className: "absolute right-1 bottom-2 h-28 w-28 sm:h-32 sm:w-32",
    enterX: 86,
    enterY: 46,
    enterRotate: 14,
  },
  {
    id: "hero-token-6",
    kind: "split",
    tone: "coral",
    className: "absolute bottom-4 left-[24%] hidden h-20 w-20 sm:block sm:h-24 sm:w-24",
    enterX: -54,
    enterY: 60,
    enterRotate: -12,
  },
  {
    id: "hero-token-7",
    kind: "orbit",
    tone: "sun",
    className: "absolute top-[58%] left-[47%] hidden h-16 w-16 lg:block",
    enterX: 0,
    enterY: 66,
    enterRotate: 30,
  },
  {
    id: "hero-token-8",
    kind: "frame",
    tone: "coral",
    className: "absolute -right-2 bottom-[28%] hidden h-16 w-16 md:block",
    enterX: 56,
    enterY: -20,
    enterRotate: 20,
  },
];

function ParallaxGroup({ children, className, distance = 28 }: ParallaxGroupProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [distance, -distance]
  );

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

export function LandingPage({ ctaHref, ctaLabel }: LandingPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroOrbitRotate = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [0, 22]
  );

  return (
    <main className="landing-page landing-body min-h-screen">
      <div className="landing-shell mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-8">
        <header className="landing-panel mb-4 flex items-center justify-between px-4 py-3 sm:mb-6 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--landing-ink)] text-xs font-bold tracking-[0.14em] text-[var(--landing-bg)]">
              KD
            </span>
            <div>
              <p className="landing-display text-[1.1rem] leading-none tracking-tight">Kurutu Draw</p>
              <p className="text-[10px] tracking-[0.18em] text-[var(--landing-muted)] uppercase">
                Diagram and Wireframe Canvas
              </p>
            </div>
          </div>
          <Link href={ctaHref} className="landing-btn-secondary text-sm">
            {ctaLabel}
          </Link>
        </header>

        <section className="landing-panel relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
          <motion.div
            className="pointer-events-none absolute -right-20 top-[-85px] hidden h-52 w-52 rounded-full border border-[var(--landing-line)]/75 lg:block"
            style={{ rotate: heroOrbitRotate }}
            aria-hidden="true"
          />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <motion.p
                className="landing-kicker"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                For product, design, and engineering teams
              </motion.p>
              <motion.h1
                className="landing-display mt-5 text-balance text-4xl leading-[0.92] font-semibold tracking-[-0.02em] sm:text-5xl lg:text-7xl"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
              >
                Sketch Product Flow
                <br />
                with Creative Clarity.
              </motion.h1>
              <motion.p
                className="mt-6 max-w-xl text-base leading-relaxed text-[var(--landing-muted)] sm:text-lg"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
              >
                Kurutu Draw is one canvas for flowcharts, wireframes, and planning artifacts. Move from rough
                thinking to organized structure without breaking momentum.
              </motion.p>
              <motion.div
                className="mt-8 flex flex-wrap items-center gap-3"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.46, ease: "easeOut", delay: 0.34 }}
              >
                <Link href={ctaHref} className="landing-btn-primary">
                  {ctaLabel}
                  <ArrowRight className="size-4" />
                </Link>
                <a href="#features" className="landing-btn-secondary">
                  Explore Features
                </a>
              </motion.div>
            </div>

            <div className="landing-hero-stage relative h-[360px] sm:h-[420px]">
              <AnimatePresence>
                {heroTokens.map((token, index) => (
                  <motion.div
                    key={token.id}
                    className={token.className}
                    initial={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            x: token.enterX,
                            y: token.enterY,
                            rotate: token.enterRotate,
                          }
                    }
                    animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 118,
                      damping: 16,
                      mass: 0.86,
                      delay: 0.45 + index * 0.05,
                    }}
                  >
                    <ArtToken kind={token.kind} tone={token.tone} className="h-full w-full" />
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.div
                className="landing-panel absolute right-4 bottom-5 max-w-[220px] px-4 py-3"
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.8 }}
              >
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--landing-muted)] uppercase">
                  Built for real workflows
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
                  Draw, connect, layer, and share from one focused surface.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-panel mt-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <ParallaxGroup className="space-y-4" distance={22}>
              <p className="landing-kicker">Capability grid</p>
              <h2 className="landing-display text-balance text-3xl leading-tight tracking-tight sm:text-4xl">
                Build with structure,
                <br />
                not friction.
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--landing-muted)] sm:text-base">
                Every control in Kurutu Draw is tuned for quick planning sessions and clean handoff conversations.
              </p>
            </ParallaxGroup>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilityPillars.map((capability, index) => {
                const Icon = capabilityIcons[index];
                return (
                  <motion.article
                    key={capability.title}
                    className="landing-feature-card relative overflow-hidden p-4 sm:p-5"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={revealViewport}
                    transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.08 }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-line)] bg-[var(--landing-bg)]">
                        <Icon className="size-4 text-[var(--landing-ink)]" />
                      </span>
                      <ArtToken
                        kind={index === 1 ? "orbit" : index === 2 ? "frame" : "semicircle"}
                        tone={index === 1 ? "teal" : index === 2 ? "ink" : "coral"}
                        className="h-10 w-10"
                        floating={false}
                      />
                    </div>
                    <h3 className="landing-display text-[1.35rem] leading-tight">{capability.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">
                      {capability.description}
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-[var(--landing-muted)] sm:text-sm">
                      {capability.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[var(--landing-accent-coral)]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-panel mt-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="landing-kicker">Workflow</p>
              <h2 className="landing-display mt-3 text-balance text-3xl leading-tight tracking-tight sm:text-4xl">
                From rough idea
                <br />
                to shared artifact.
              </h2>
            </div>
            <ArtToken kind="orbit" tone="sun" className="hidden h-16 w-16 sm:block" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = workflowIcons[index];
              return (
                <ParallaxGroup key={step.title} distance={18 + index * 4}>
                  <motion.article
                    className="landing-step-card h-full p-4 sm:p-5"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={revealViewport}
                    transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.08 }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="landing-step-index">{`0${index + 1}`}</span>
                      <Icon className="size-4 text-[var(--landing-muted)]" />
                    </div>
                    <h3 className="landing-display text-2xl leading-tight tracking-tight">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">{step.description}</p>
                  </motion.article>
                </ParallaxGroup>
              );
            })}
          </div>
        </section>

        <section className="landing-panel mt-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            {templateHighlights.map((template, index) => {
              const Icon = templateIcons[index];
              return (
                <motion.article
                  key={template.name}
                  className="landing-template-card relative overflow-hidden p-5 sm:p-6"
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={revealViewport}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.1 }}
                >
                  <ArtToken
                    kind={index === 0 ? "split" : "frame"}
                    tone={index === 0 ? "teal" : "coral"}
                    className={cn(
                      "absolute top-5 right-5",
                      index === 0 ? "h-14 w-14" : "h-16 w-16"
                    )}
                    floating={false}
                  />
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--landing-line)] bg-[var(--landing-bg)]">
                    <Icon className="size-5 text-[var(--landing-ink)]" />
                  </div>
                  <h3 className="landing-display text-[1.8rem] leading-tight tracking-tight">{template.name}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--landing-muted)] sm:text-base">
                    {template.description}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-[var(--landing-muted)]">
                    {template.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--landing-accent-teal)]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="landing-panel mt-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="mb-8">
            <p className="landing-kicker">Share and output</p>
            <h2 className="landing-display mt-3 text-balance text-3xl leading-tight tracking-tight sm:text-4xl">
              Keep everyone aligned
              <br />
              beyond the canvas.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {outputFeatures.map((feature, index) => {
              const Icon = outputIcons[index];
              return (
                <motion.article
                  key={feature.title}
                  className="landing-output-card p-4 sm:p-5"
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={revealViewport}
                  transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.09 }}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--landing-line)] bg-[var(--landing-bg)]">
                    <Icon className="size-4 text-[var(--landing-ink)]" />
                  </span>
                  <h3 className="landing-display mt-4 text-2xl leading-tight tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--landing-muted)]">{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <motion.section
          className="landing-panel landing-cta-panel mt-6 px-4 py-8 sm:px-8 sm:py-10"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={revealViewport}
          transition={{ duration: 0.56, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="landing-kicker">Ready to move faster?</p>
              <h2 className="landing-display mt-3 text-balance text-3xl leading-tight tracking-tight sm:text-5xl">
                Start your next diagram
                <br />
                in Kurutu Draw.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--landing-muted)] sm:text-base">
                Sign in with Google, open your editor, and continue building from one connected workspace.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={ctaHref} className="landing-btn-primary">
                {ctaLabel}
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/editor" className="landing-btn-secondary">
                Open Editor
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
