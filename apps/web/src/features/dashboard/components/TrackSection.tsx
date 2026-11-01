import { useMemo, useState } from "react";

type ViewPoint = { _id: string; views: number; demoViews?: number };
type Period = 7 | 30 | 90;

const TrackSection = ({ data }: { data: ViewPoint[] }) => {
  const [period, setPeriod] = useState<Period>(7);
  const points = useMemo(() => {
    const today = new Date();
    const byDay = new Map(data.map((point) => [point._id, point]));
    return Array.from({ length: period }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (period - index - 1)));
      const key = date.toISOString().slice(0, 10);
      const row = byDay.get(key);
      const views = row?.views ?? 0;
      const demoViews = Math.min(views, Math.max(0, row?.demoViews ?? 0));
      return { key, views, demoViews, recordedViews: views - demoViews, date };
    });
  }, [data, period]);
  const total = points.reduce((sum, point) => sum + point.views, 0);
  const demoTotal = points.reduce((sum, point) => sum + point.demoViews, 0);
  const recordedTotal = total - demoTotal;
  const peak = points.reduce((best, point) => point.views > best.views ? point : best, points[0]);
  const max = Math.max(1, ...points.map((point) => point.views));
  const chart = { left: 64, right: 986, top: 20, bottom: 220 };
  const x = (index: number) => chart.left + (index / Math.max(points.length - 1, 1)) * (chart.right - chart.left);
  const y = (value: number) => chart.bottom - (value / max) * (chart.bottom - chart.top);
  const linePath = (key: "recordedViews" | "demoViews") => points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`)
    .join(" ");
  const yTicks = Array.from(new Set(Array.from({ length: 4 }, (_, index) => Math.ceil((max * (index + 1)) / 4))));
  const xTickIndexes = Array.from(new Set([0, Math.round((period - 1) / 3), Math.round(((period - 1) * 2) / 3), period - 1]));
  const dateLabel = (date: Date, options: Intl.DateTimeFormatOptions) => date.toLocaleDateString(undefined, options);

  return (
    <section className="rounded-3xl border border-brand-secondary/10 bg-white p-5 shadow-[0_18px_48px_-38px_var(--color-brand-secondary)] sm:p-7" aria-labelledby="dashboard-analytics-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">Profile reach</p>
          <h2 id="dashboard-analytics-title" className="mt-1 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">Profile views</h2>
          <p className="mt-1 font-poppins text-caption text-ink/55">Daily views over the last {period} days</p>
        </div>
        <div className="flex rounded-full border border-brand-secondary/10 bg-surface-warm p-1" role="group" aria-label="Analytics date range">
          {([7, 30, 90] as const).map((days) => (
            <button key={days} type="button" aria-pressed={period === days} onClick={() => setPeriod(days)} className={`min-h-9 rounded-full px-3 font-outfit text-caption font-medium transition-colors ${period === days ? "bg-brand text-white" : "text-ink/60 hover:text-brand"}`}>
              {days}D
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Profile view summaries">
        <Summary label="Total views" value={total.toLocaleString()} detail={`Last ${period} days`} />
        <Summary label="Recorded views" value={recordedTotal.toLocaleString()} detail="Recorded profile loads" />
        <Summary label="Daily average" value={(total / period).toFixed(total % period === 0 ? 0 : 1)} detail="Views per day" />
        <Summary label="Busiest day" value={total ? peak.views.toLocaleString() : "—"} detail={total ? dateLabel(peak.date, { month: "short", day: "numeric" }) : "No visits yet"} />
      </div>

      {total === 0 && <div className="mt-5 rounded-2xl bg-surface-warm px-4 py-3"><p className="m-0 font-outfit text-body font-semibold text-brand-secondary">Your reach starts here</p><p className="mt-1 mb-0 font-poppins text-caption leading-5 text-ink/55">Profile views appear after people visit your public organization page.</p></div>}

      <div className="relative mt-6 h-56" role="img" aria-labelledby="reach-chart-title" aria-describedby="reach-chart-description">
        <svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible" viewBox="0 0 1000 272" preserveAspectRatio="none">
          {yTicks.map((tick) => {
            const tickY = y(tick);
            return <g key={tick}><line x1={chart.left} x2={chart.right} y1={tickY} y2={tickY} stroke="var(--color-border-subtle)" strokeDasharray="3 6" /></g>;
          })}
          <line x1={chart.left} x2={chart.right} y1={chart.bottom} y2={chart.bottom} stroke="var(--color-border-subtle)" />
          <path d={`${linePath("recordedViews")} L${x(points.length - 1)},${chart.bottom} L${x(0)},${chart.bottom} Z`} fill="var(--color-brand)" fillOpacity="0.08" />
          {demoTotal > 0 && <path d={`${linePath("demoViews")} L${x(points.length - 1)},${chart.bottom} L${x(0)},${chart.bottom} Z`} fill="var(--color-info)" fillOpacity="0.08" />}
          <path d={linePath("recordedViews")} fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {demoTotal > 0 && <path d={linePath("demoViews")} fill="none" stroke="var(--color-info)" strokeWidth="2.5" strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {points.map((point, index) => <g key={point.key}><circle cx={x(index)} cy={y(point.recordedViews)} r={period === 7 ? 4 : 2.5} fill="var(--color-brand)" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{dateLabel(point.date, { weekday: "long", month: "long", day: "numeric" })}: {point.recordedViews} recorded views</title></circle>{demoTotal > 0 && point.demoViews > 0 && <circle cx={x(index)} cy={y(point.demoViews)} r={period === 7 ? 3.5 : 2.25} fill="var(--color-info)" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke"><title>{dateLabel(point.date, { weekday: "long", month: "long", day: "numeric" })}: {point.demoViews} sample views</title></circle>}</g>)}
        </svg>
        <span id="reach-chart-title" className="sr-only">Daily organization profile views</span>
        <span id="reach-chart-description" className="sr-only">Line chart for {period} days. {recordedTotal} recorded views and {demoTotal} sample views. Peak day had {total ? peak.views : 0} views.</span>
        {yTicks.map((tick) => <span key={tick} aria-hidden="true" className="absolute left-0 w-[6%] -translate-y-1/2 pr-1 text-right font-poppins text-caption text-ink/50" style={{ top: `${(y(tick) / 272) * 100}%` }}>{tick}</span>)}
        {xTickIndexes.map((index) => <span key={points[index].key} aria-hidden="true" className={`absolute bottom-0 font-poppins text-caption text-ink/50 ${index === 0 ? "translate-x-0" : index === period - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(x(index) / 1000) * 100}%` }}>{dateLabel(points[index].date, { month: "short", day: "numeric" })}</span>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-brand-secondary/8 pt-4">
        <p className="m-0 font-poppins text-caption leading-5 text-ink/50">Views count profile loads. They do not represent unique people.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-poppins text-caption text-ink/60" aria-label="Chart legend">
          <span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 rounded bg-brand" />Recorded ({recordedTotal.toLocaleString()})</span>
          {demoTotal > 0 && <span className="inline-flex items-center gap-2"><i className="h-0.5 w-4 rounded border-t-2 border-dashed border-info" />Sample ({demoTotal.toLocaleString()})</span>}
        </div>
      </div>
    </section>
  );
};

const Summary = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="min-w-0 rounded-2xl bg-surface-warm px-3.5 py-3 sm:px-4">
    <p className="m-0 truncate font-poppins text-caption text-ink/55">{label}</p>
    <p className="mt-1 mb-0 truncate font-outfit text-xl font-semibold tracking-tight text-brand-secondary sm:text-2xl">{value}</p>
    <p className="mt-0.5 mb-0 truncate font-poppins text-caption text-ink/45">{detail}</p>
  </div>
);

export default TrackSection;
