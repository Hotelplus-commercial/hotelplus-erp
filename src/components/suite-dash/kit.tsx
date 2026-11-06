/* Suite Dashboards R1 (Patch B) DB1 — shared layout pieces for the app dashboards and the Suite Overview.
 * Read only: no writes, no new storage key. Sample cards carry `ข้อมูลตัวอย่าง` + `ที่มา (เมื่อเชื่อมแล้ว): …`. */
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { comparePeriods, thShort, type CmpChoice } from "@/lib/card-compare";
import { DEMO_DAY, onDemoSessionChange, psDemoOn, setPsDemoSession } from "@/lib/demo-session";
import { setPartnerDemo } from "@/lib/debt-partner-store";
import { seedAcBillsDemo } from "@/lib/partner-shutoff-ac";
import { setTicketDemo } from "@/lib/tickets-l0";
import { cn } from "@/lib/utils";

export const SAMPLE_TAG = "ข้อมูลตัวอย่าง";
export const sourceLine = (s: string) => `ที่มา (เมื่อเชื่อมแล้ว): ${s}`;

/** Shared DEMO switch (same as AC App › บิล Partner): ?demo=1 / 0 writes it once, then the page follows it. null = not read yet. */
export function useSuiteDemo(): boolean | null {
  const [demo, setDemo] = useState<boolean | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "1" && !psDemoOn()) setPsDemoSession(true); else if (q === "0" && psDemoOn()) setPsDemoSession(false);
    const read = () => setDemo(psDemoOn());
    read();
    return onDemoSessionChange(read);
  }, []);
  useEffect(() => {
    if (demo == null) return;
    setPartnerDemo(demo); setTicketDemo(demo); if (demo) seedAcBillsDemo();
  }, [demo]);
  return demo;
}
export const suiteToday = (demo: boolean) => (demo ? DEMO_DAY : new Date().toISOString().slice(0, 10));
export const demoSearch = (demo: boolean) => (demo ? { demo: 1 } : {});

/* ---------- period picker: เดือนนี้ / ไตรมาส / ปี / กำหนดเอง (default เดือนนี้) ---------- */
export type DashPeriod = { choice: CmpChoice; from: string; to: string; label: string };
const MODE_TH = { month: "เดือนนี้", quarter: "ไตรมาส", year: "ปี", custom: "กำหนดเอง" } as const;
export function useDashPeriod(today: string) {
  const [choice, setChoice] = useState<CmpChoice>({ mode: "month" });
  const p = useMemo(() => comparePeriods(choice, today), [choice, today]);
  const period: DashPeriod = { choice, from: p.a.from, to: p.a.to, label: choice.mode === "month" ? MODE_TH.month : `${thShort(p.a.from)} – ${thShort(p.a.to)}` };
  const ym = today.slice(0, 7);
  const control = (
    <div className="flex flex-wrap items-center gap-2" data-testid="dash-period">
      <select aria-label="ช่วงเวลา" className="h-8 rounded-md border bg-background px-2 text-xs" value={choice.mode}
        onChange={(e) => { const m = e.target.value as CmpChoice["mode"]; setChoice(m === "custom" ? { mode: "custom", custom: { a: { from: ym, to: ym }, b: { from: ym, to: ym } } } : { mode: m }); }}>
        {(Object.keys(MODE_TH) as (keyof typeof MODE_TH)[]).map((k) => <option key={k} value={k}>{MODE_TH[k]}</option>)}
      </select>
      {choice.mode === "custom" && choice.custom && (
        <>
          <input type="month" aria-label="ตั้งแต่เดือน" className="h-8 rounded-md border bg-background px-2 text-xs" value={choice.custom.a.from} max={ym}
            onChange={(e) => setChoice({ mode: "custom", custom: { a: { from: e.target.value, to: choice.custom!.a.to }, b: choice.custom!.b } })} />
          <input type="month" aria-label="ถึงเดือน" className="h-8 rounded-md border bg-background px-2 text-xs" value={choice.custom.a.to} max={ym}
            onChange={(e) => setChoice({ mode: "custom", custom: { a: { from: choice.custom!.a.from, to: e.target.value }, b: choice.custom!.b } })} />
        </>
      )}
    </div>
  );
  return { period, control };
}

export function InfoTip({ text }: { text: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger className="text-xs text-muted-foreground hover:text-foreground" aria-label="คำอธิบาย" data-testid="dash-info">ⓘ</PopoverTrigger>
      <PopoverContent className="max-w-xs text-xs">{text}</PopoverContent>
    </Popover>
  );
}
export function SampleBadge({ source }: { source: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]" data-testid="dash-sample">
      <span className="rounded bg-warning/15 px-1.5 py-0.5 font-semibold text-warning-foreground">{SAMPLE_TAG}</span>
      <span className="text-muted-foreground">{sourceLine(source)}</span>
    </div>
  );
}
export const NowChip = () => <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">ณ วันนี้</span>;

export function DashHeader({ app, title, period, control, demo, extra }: { app: string; title?: string; period: string; control?: ReactNode; demo: boolean; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{app}</p>
        <h1 className="text-2xl font-bold">{title ?? `${app} Dashboard`}</h1>
        <p className="text-sm text-muted-foreground">ภาพรวม · {period}{demo && <span className="ml-2 font-semibold text-warning-foreground">DEMO · 28 ต.ค. 2569</span>}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{extra}{control}</div>
    </div>
  );
}

export type TileProps = { label: string; value: ReactNode; sub?: ReactNode | undefined; sample?: string | undefined; now?: boolean; tone?: "bad" | "good" | undefined; testId?: string };
export function Tile({ label, value, sub, sample, now, tone, testId }: TileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4" data-testid={testId ?? "dash-tile"}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label}</span>{now && <NowChip />}</div>
      <div className={cn("text-2xl font-bold tabular-nums", tone === "bad" && "text-destructive", tone === "good" && "text-success")}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      {sample && <SampleBadge source={sample} />}
    </div>
  );
}
export const TileStrip = ({ children }: { children: ReactNode }) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
export const CardGrid = ({ children }: { children: ReactNode }) => <div className="grid gap-4 lg:grid-cols-2">{children}</div>;

export function DCard({ title, question, info, href, demo, sample, now, children, wide, testId }: {
  title: string; question: string; info: ReactNode; href?: string; demo: boolean; sample?: string; now?: boolean; children: ReactNode; wide?: boolean; testId?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", wide && "lg:col-span-2")} data-testid={testId ?? "dash-card"}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 font-semibold">{title}<InfoTip text={info} /></h2>
          <p className="text-xs text-muted-foreground">{question}</p>
        </div>
        {now && <NowChip />}
      </div>
      {sample && <SampleBadge source={sample} />}
      <div className="flex-1">{children}</div>
      {href && <DetailLink href={href} demo={demo} />}
    </section>
  );
}
export function DetailLink({ href, demo, label = "ดูรายละเอียด →" }: { href: string; demo: boolean; label?: string }) {
  return <Link to={href as never} search={demoSearch(demo) as never} className="self-end text-xs font-semibold text-primary hover:underline">{label}</Link>;
}

/** Simple horizontal bars (sample and real lists). */
export function HBars({ rows, max, unit = "" }: { rows: { label: string; value: number; target?: number }[]; max?: number; unit?: string }) {
  const m = max ?? Math.max(1, ...rows.map((r) => Math.max(r.value, r.target ?? 0)));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="text-xs">
          <div className="flex justify-between"><span>{r.label}</span><span className="tabular-nums font-semibold">{r.value.toLocaleString("en-US")}{unit}{r.target != null && <span className="font-normal text-muted-foreground"> / {r.target.toLocaleString("en-US")}{unit}</span>}</span></div>
          <div className="relative mt-1 h-2 rounded bg-muted">
            <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, (r.value / m) * 100)}%` }} />
            {r.target != null && <div className="absolute top-[-2px] h-3 border-l-2 border-dashed border-foreground/60" style={{ left: `${Math.min(100, (r.target / m) * 100)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
export const thb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;
