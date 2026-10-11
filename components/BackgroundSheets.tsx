const sheet = "absolute hidden rounded-[4px] bg-sheet shadow-[0_18px_40px_rgba(60,40,10,0.14)] min-[900px]:block";

/** Decorative sheets behind the content; hidden on small screens. `top` sits by the hero, `bottom` tucks under the desk. */
export function TopSheets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0">
      <div className={`${sheet} left-[-30px] top-24 h-[260px] w-[200px] -rotate-[8deg]`} />
      <div className={`${sheet} right-[-30px] top-20 h-[290px] w-[220px] rotate-[7deg] overflow-hidden p-5 font-mono text-[11px] leading-[1.7] text-muted`}>
        <div className="font-semibold text-accent"># Quarterly report</div>
        <div>Revenue grew <b>18%</b></div>
        <div className="mt-2 font-semibold text-accent">## Highlights</div>
        <div>- New markets opened</div>
        <div>- | Region | Q3 |</div>
      </div>
    </div>
  );
}

export function BottomSheets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className={`${sheet} bottom-[-26px] left-[-70px] h-[220px] w-[150px] rotate-[5deg]`} />
      <div className={`${sheet} bottom-[-30px] right-[-76px] h-[220px] w-[160px] -rotate-[6deg]`} />
    </div>
  );
}
