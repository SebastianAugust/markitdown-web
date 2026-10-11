const sheet = "absolute hidden rounded-[4px] border border-[rgba(255,235,200,0.07)] bg-[#262019] shadow-[0_18px_40px_rgba(0,0,0,0.55)] min-[900px]:block";

function Lines({ widths }: { widths: number[] }) {
  return (
    <div className="flex flex-col gap-2 p-5">
      {widths.map((w, i) => (
        <div key={i} className="h-1 rounded-sm bg-[#3a332b]" style={{ width: `${w}%`, height: i === 0 ? 6 : 4 }} />
      ))}
    </div>
  );
}

/** Decorative sheets behind the content; hidden on small screens. Top pair sits by the hero. */
export function TopSheets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0">
      <div className={`${sheet} left-[-30px] top-24 h-[260px] w-[200px] -rotate-[8deg]`}>
        <Lines widths={[60, 100, 92, 96, 70, 100, 84, 90, 55]} />
      </div>
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

/** Bottom pair peeks out from under the desk. */
export function BottomSheets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className={`${sheet} bottom-[-26px] left-[-70px] h-[220px] w-[150px] rotate-[5deg]`}>
        <Lines widths={[65, 100, 90, 100, 75, 95]} />
      </div>
      <div className={`${sheet} bottom-[-30px] right-[-76px] h-[220px] w-[160px] -rotate-[6deg]`}>
        <Lines widths={[55, 100, 94, 88, 100, 70]} />
      </div>
    </div>
  );
}
