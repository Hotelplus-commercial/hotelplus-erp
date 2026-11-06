/* Patch A SP5 — Demand Calendar, layout copied from the real portal (IMG-1). Sample data only. */
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DEMAND_PROVINCES, REGION_LABEL, filterProvinces, seasonsOf, summaryOf, type Region, type Season } from "@/lib/bd/demand-calendar-data";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TONE: Record<Season, string> = {
  H: "border-success/40 bg-success/15 text-success",
  M: "border-warning/50 bg-warning/20 text-warning-foreground",
  L: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function DemandCalendarPage() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<Region | "All">("All");
  const [type, setType] = useState("Hotel");
  const [view, setView] = useState<"monthly" | "summary">("monthly");
  const rows = useMemo(() => filterProvinces(DEMAND_PROVINCES, q, region), [q, region]);
  return (
    <div className="space-y-4" data-testid="demand-calendar">
      <div className="rounded-xl border bg-card p-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5 text-info" />Demand Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">ระดับ demand ของที่พักแต่ละจังหวัดในประเทศไทย จำแนกตามประเภทที่พักและเดือน</p>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Input className="min-w-[16rem] flex-1" placeholder="ค้นหาจังหวัด..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาจังหวัด" />
          <select aria-label="ภาค" className="h-9 rounded-md border bg-background px-2 text-sm" value={region} onChange={(e) => setRegion(e.target.value as Region | "All")}>
            <option value="All">All</option>
            {(Object.keys(REGION_LABEL) as Region[]).map((r) => <option key={r} value={r}>{REGION_LABEL[r]}</option>)}
          </select>
          <select aria-label="ประเภทที่พัก" className="h-9 rounded-md border bg-background px-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Hotel</option>
          </select>
          <div className="flex rounded-md border p-0.5">
            {(["monthly", "summary"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                className={cn("rounded px-3 py-1 text-sm", view === v ? "bg-warning font-semibold text-warning-foreground" : "text-muted-foreground")}>
                {v === "monthly" ? "Monthly" : "Summary"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded border px-2 py-0.5", TONE.H)}>High season</span>
          <span className={cn("rounded border px-2 py-0.5", TONE.M)}>Shoulder</span>
          <span className={cn("rounded border px-2 py-0.5", TONE.L)}>Low season</span>
          <span className="text-muted-foreground">· คำนวณจากข้อมูล occupancy / นักท่องเที่ยวเฉลี่ยของแต่ละจังหวัด</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        {view === "monthly" ? (
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">จังหวัด ({rows.length})</th>
              {MONTHS.map((m) => <th key={m} className="px-1 py-2 font-medium">{m}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.en} className="border-t" data-testid="dc-row">
                  <td className="px-3 py-1"><div className="font-medium">{p.en}</div><div className="text-[10px] text-muted-foreground">{p.th}</div></td>
                  {seasonsOf(p).map((s, i) => <td key={i} className="px-0.5 py-1"><div className={cn("rounded border py-0.5 text-center text-[10px]", TONE[s])}>{s}</div></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground"><th className="px-3 py-2 text-left font-medium">จังหวัด ({rows.length})</th><th>High</th><th>Shoulder</th><th>Low</th></tr></thead>
            <tbody>
              {rows.map((p) => { const s = summaryOf(p); return (
                <tr key={p.en} className="border-t" data-testid="dc-row">
                  <td className="px-3 py-1.5"><div className="font-medium">{p.en}</div><div className="text-[10px] text-muted-foreground">{p.th}</div></td>
                  <td className="text-center">{s.H}</td><td className="text-center">{s.M}</td><td className="text-center">{s.L}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">H · High · M · Shoulder · L · Low · ข้อมูลตัวอย่างจากหน้า portal เดิม (ประเภท Hotel)</p>
    </div>
  );
}
