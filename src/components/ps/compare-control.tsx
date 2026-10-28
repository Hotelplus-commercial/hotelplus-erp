/* Header R2 §2.2 — shared per-card CompareControl + the grey "ณ วันนี้" chip.
 * One choice per card, persisted per browser under psdash.cmp.{tab}.{card} (same pattern as note toggles). */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CMP_MODE_LABEL, DEFAULT_CMP, TH_MONTH, beYear, cmpStorageKey, comparePeriods, parseChoice, type CmpChoice, type CmpMode, type ComparePeriods, type MonthRange } from "@/lib/card-compare";
import { cn } from "@/lib/utils";

/** Point-in-time card marker: no period control, no Δ. */
export function NowChip({ className }: { className?: string }) {
  return <span data-testid="now-chip" className={cn("cmp-now-chip", className)}>ณ วันนี้</span>;
}

export function useCardCompare(tab: string, card: string, today: string) {
  const key = cmpStorageKey(tab, card);
  const [choice, setChoiceState] = useState<CmpChoice>(DEFAULT_CMP);
  useEffect(() => {
    try { setChoiceState(parseChoice(localStorage.getItem(key))); } catch { setChoiceState(DEFAULT_CMP); }
  }, [key]);
  const setChoice = (c: CmpChoice) => {
    setChoiceState(c);
    try { localStorage.setItem(key, JSON.stringify(c)); } catch { /* storage is optional */ }
  };
  const periods = useMemo(() => comparePeriods(choice, today), [choice, today]);
  return { choice, setChoice, ...periods, control: <CompareControl choice={choice} onChange={setChoice} periods={periods} today={today} /> };
}
export type CardCompare = ReturnType<typeof useCardCompare>;

const monthOptions = (today: string) => {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < 36; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push({ value: d.toISOString().slice(0, 7), label: `${TH_MONTH[d.getUTCMonth()]} ${beYear(d.getUTCFullYear())}` });
  }
  return out;
};

export function CompareControl({ choice, onChange, periods, today }: { choice: CmpChoice; onChange: (c: CmpChoice) => void; periods: ComparePeriods; today: string }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const cur = today.slice(0, 7);
  const prev = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(5, 7) - 2, 1)).toISOString().slice(0, 7);
  const [a, setA] = useState<MonthRange>(choice.custom?.a ?? { from: cur, to: cur });
  const [b, setB] = useState<MonthRange>(choice.custom?.b ?? { from: prev, to: prev });
  const opts = monthOptions(today);
  const pick = (mode: CmpMode) => {
    if (mode === "custom") { setCustom(true); return; }
    onChange({ mode }); setOpen(false);
  };
  const valid = a.from <= a.to && b.from <= b.to;
  const sel = (label: string, v: string, set: (s: string) => void) => (
    <label className="cmp-field"><span>{label}</span>
      <select aria-label={label} value={v} onChange={(e) => set(e.target.value)}>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    </label>
  );
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCustom(false); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="cmp-pill" title={periods.full} aria-label={`เลือกการเทียบ · ${periods.full}`} data-testid="compare-control">
          <CalendarDays className="size-3.5" aria-hidden />{periods.short}<ChevronDown className="size-3" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="cmp-pop">
        {!custom ? (
          <ul role="menu" className="cmp-menu">
            {(Object.keys(CMP_MODE_LABEL) as CmpMode[]).map((m) => (
              <li key={m}><button type="button" role="menuitemradio" aria-checked={choice.mode === m} className={cn("cmp-item", choice.mode === m && "cmp-item-on")} onClick={() => pick(m)}>{CMP_MODE_LABEL[m]}</button></li>
            ))}
          </ul>
        ) : (
          <div className="cmp-custom">
            <p className="cmp-custom-title">ช่วง A (ช่วงที่ดู)</p>
            <div className="cmp-custom-row">{sel("A จาก", a.from, (v) => setA({ ...a, from: v }))}{sel("A ถึง", a.to, (v) => setA({ ...a, to: v }))}</div>
            <p className="cmp-custom-title">ช่วง B (ช่วงที่เทียบ)</p>
            <div className="cmp-custom-row">{sel("B จาก", b.from, (v) => setB({ ...b, from: v }))}{sel("B ถึง", b.to, (v) => setB({ ...b, to: v }))}</div>
            <div className="cmp-custom-actions">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setCustom(false); setOpen(false); }}>ยกเลิก</Button>
              <Button type="button" size="sm" disabled={!valid} onClick={() => { onChange({ mode: "custom", custom: { a, b } }); setCustom(false); setOpen(false); }}>ใช้ช่วงนี้</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
