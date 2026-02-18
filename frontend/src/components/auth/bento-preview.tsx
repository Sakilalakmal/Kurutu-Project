const tiles = [
  {
    key: "glass-1",
    className:
      "bg-[radial-gradient(circle_at_25%_30%,rgba(183,202,229,0.45),transparent_45%),radial-gradient(circle_at_70%_70%,rgba(151,171,205,0.3),transparent_42%),linear-gradient(140deg,rgba(44,53,82,0.78),rgba(16,19,33,0.88))] border border-white/5 backdrop-blur-md",
    content: null,
  },
  {
    key: "lavender-1",
    className:
      "bg-[linear-gradient(155deg,#c18cff,#a977f4)] text-zinc-900 shadow-[0_18px_40px_-28px_rgba(196,181,253,0.75)]",
    content: (
      <div className="h-full bg-[radial-gradient(circle,rgba(75,38,128,0.2)_1px,transparent_1.5px)] [background-size:14px_14px]">
        <p className="pt-14 text-xl font-medium leading-tight tracking-tight md:text-2xl">
          Total Care.
          <br />
          Total Different.
        </p>
      </div>
    ),
  },
  {
    key: "glass-2",
    className:
      "bg-[radial-gradient(circle_at_68%_22%,rgba(196,210,234,0.5),transparent_36%),radial-gradient(circle_at_22%_70%,rgba(126,147,184,0.4),transparent_36%),linear-gradient(150deg,rgba(25,31,50,0.9),rgba(10,12,24,0.95))] border border-white/5 backdrop-blur-sm",
    content: null,
  },
  {
    key: "brand",
    className:
      "bg-[linear-gradient(140deg,#b47bff,#9868e8)] text-zinc-950 shadow-[0_18px_40px_-28px_rgba(167,139,250,0.8)]",
    content: (
      <div className="flex h-full items-center justify-center">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-[#0a0a12] text-4xl font-semibold tracking-tight text-zinc-100 md:size-20 md:text-5xl">
          K
        </span>
      </div>
    ),
  },
  {
    key: "yellow-1",
    className:
      "bg-[linear-gradient(135deg,#f2e99a,#ebe293)] text-zinc-900 shadow-[0_18px_40px_-28px_rgba(250,204,21,0.65)]",
    content: (
      <div className="space-y-4">
        <span className="inline-flex text-2xl leading-none">+</span>
        <p className="text-xl font-medium leading-tight tracking-tight md:text-2xl">
          Building trust
          <br />
          in blockchain
          <br />
          technology
        </p>
      </div>
    ),
  },
  {
    key: "yellow-2",
    className:
      "bg-[linear-gradient(145deg,#efe7a0,#e8e09a)] text-zinc-900 shadow-[0_18px_40px_-28px_rgba(251,191,36,0.6)]",
    content: (
      <div className="space-y-4">
        <span className="inline-flex text-2xl leading-none">+</span>
        <p className="text-xl font-medium leading-tight tracking-tight md:text-2xl">
          Own
          <br />
          your power
        </p>
      </div>
    ),
  },
];

export function BentoPreview() {
  return (
    <section
      aria-hidden="true"
      className="relative h-full min-h-[560px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0c0f18] p-4 shadow-[0_28px_70px_-38px_rgba(0,0,0,0.8)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(167,139,250,0.15),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(250,204,21,0.14),transparent_45%),repeating-linear-gradient(0deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_86px),repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_86px)]" />
      <div className="relative grid h-full grid-cols-2 gap-3 sm:gap-4">
        {tiles.map((tile) => (
          <article
            key={tile.key}
            className={[
              "min-h-36 rounded-3xl p-5 transition duration-300 ease-out md:min-h-40",
              "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_24px_50px_-30px_rgba(0,0,0,0.8)]",
              tile.className,
            ].join(" ")}
          >
            {tile.content}
          </article>
        ))}
      </div>
    </section>
  );
}
