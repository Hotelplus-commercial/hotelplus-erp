/* Patch A SP9 — BD Meeting Analyzer dashboard, layout copied from IMG-7 with its sample data (ข้อมูลตัวอย่าง). Read only. */
import { useState } from "react";
import { Flag, History, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MA_BD, MA_DURATION, MA_TILES, MA_TOPICS, filterFlags, filterLatest, inPeriod, sessionsOf, type MaPeriod,
} from "@/lib/bd/meeting-analyzer-sample";

const PERIODS: { v: MaPeriod; l: string }[] = [{ v: "all", l: "All time" }, { v: "30d", l: "30 วันล่าสุด" }, { v: "7d", l: "7 วันล่าสุด" }];
const tone = (pct: number) => (pct < 50 ? "bg-destructive" : pct < 70 ? "bg-warning" : "bg-success");
const toneText = (pct: number) => (pct < 50 ? "text-destructive" : pct < 70 ? "text-warning" : "text-success");
const PAGE = 3;

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Bars({ rows, avg, testId }: { rows: { label: string; sub?: string; value: number }[]; avg: number; testId: string }) {
  return (
    <div className="relative h-56 pl-8" data-testid={testId}>
      {[0, 25, 50, 75, 100].map((g) => (
        <div key={g} className="absolute left-8 right-0 border-t border-border/60" style={{ bottom: `calc(${g}% * 0.8 + 20%)` }}>
          <span className="absolute -left-8 -top-2 w-6 text-right text-[10px] text-muted-foreground">{g}</span>
        </div>
      ))}
      <div className="absolute left-8 right-0 border-t border-dashed border-warning" style={{ bottom: `calc(${avg}% * 0.8 + 20%)` }}>
        <span className="absolute -top-4 left-1 text-[10px] font-semibold text-warning">เฉลี่ย {avg}</span>
      </div>
      <div className="absolute inset-x-8 bottom-0 top-0 flex items-end gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end text-center">
            <div className="mx-auto w-full max-w-12 rounded-t bg-foreground" style={{ height: `calc(${r.value}% * 0.8)` }} title={`${r.label}: ${r.value}`} />
            <div className="h-[20%] pt-1 text-[11px] leading-tight">{r.label}{r.sub && <div className="text-[10px] text-muted-foreground">{r.sub}</div>}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="m-auto text-sm text-muted-foreground">ไม่มี session ในช่วงนี้</div>}
      </div>
    </div>
  );
}

export function MeetingAnalyzerPage() {
  const [period, setPeriod] = useState<MaPeriod>("all");
  const [person, setPerson] = useState("all");
  const [sessionPerson, setSessionPerson] = useState("ชาร่า");
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<null | "new" | "history">(null);

  const people = [{ v: "all", l: "ทั้งทีม" }, ...MA_BD.map((b) => ({ v: b.name, l: b.name }))];
  const bdRows = person === "all" ? MA_BD : MA_BD.filter((b) => b.name === person);
  const one = person === "all" ? null : bdRows[0];
  const sessions = sessionsOf(sessionPerson).filter((s) => inPeriod(s.date, period));
  const sessionAvg = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0;
  const flags = filterFlags(person);
  const pages = Math.max(1, Math.ceil(flags.length / PAGE));
  const shownFlags = showAll ? flags : flags.slice(page * PAGE, page * PAGE + PAGE);
  const latest = filterLatest(person);
  const periodLabel = PERIODS.find((p) => p.v === period)!.l;

  return (
    <div className="space-y-4" data-testid="bd-meeting-analyzer">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">ภาพรวมทีม BD &amp; Training · {periodLabel} · <span className="rounded bg-muted px-1.5 py-0.5">ข้อมูลตัวอย่าง</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="ช่วงเวลา" value={period} onChange={(v) => setPeriod(v as MaPeriod)} options={PERIODS.map((p) => ({ v: p.v, l: p.l }))} />
          <Select label="ทีม" value={person} onChange={(v) => { setPerson(v); setPage(0); }} options={people} />
          <Button variant="outline" size="sm" onClick={() => setOpen("history")}><History className="mr-1 h-4 w-4" />History</Button>
          <Button size="sm" className="bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setOpen("new")}>+ New Analysis</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Tile value={String(one ? one.meets : MA_TILES.sessions)} chip="Sessions" chipTone="bg-success/15 text-success" label="Sessions ทั้งหมด" testId="ma-tile-sessions" />
        <Tile value={`${one ? one.avg : MA_TILES.teamAvg}/100`} chip="▲ ค่าเฉลี่ยทีม" chipTone="bg-success/15 text-success" label="คะแนนเฉลี่ยทีม" testId="ma-tile-avg" />
        <Tile value={String(one ? flags.length : MA_TILES.flags)} chip="ต้อง coaching" chipTone="bg-destructive/15 text-destructive" label="Flag Alerts" testId="ma-tile-flags" />
        <Tile value={String(MA_TILES.processing)} label="กำลังประมวลผล" testId="ma-tile-processing" />
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">คะแนนเฉลี่ยรายหัวข้อ</h2>
        <p className="text-xs font-medium">จำนวนการประชุม: {one ? one.meets : MA_TILES.sessions}</p>
        <p className="mb-3 text-xs text-muted-foreground">เฉลี่ยคะแนนแต่ละหัวข้อ S1–S8 จากทุก session</p>
        <div className="grid gap-3 md:grid-cols-4">
          {MA_TOPICS.map((t) => {
            const pct = Math.round((t.score / t.max) * 100);
            return (
              <div key={t.code} className="rounded-lg bg-muted/40 p-3" data-testid="ma-topic">
                <div className="flex justify-between text-xs"><b>{t.code}</b><b className={toneText(pct)}>{t.score}/{t.max}</b></div>
                <div className="text-[11px] text-muted-foreground">{t.label}</div>
                <div className="mt-2 h-1.5 rounded bg-muted"><div className={`h-1.5 rounded ${tone(pct)}`} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Duration &amp; Talk Ratio เฉลี่ย</h2>
        <p className="mb-3 text-xs text-muted-foreground">ระยะเวลาประชุมและสัดส่วนการพูด BD เทียบกับลูกค้า</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-lg bg-muted/40 px-5 py-3"><div className="text-[10px] font-semibold uppercase text-muted-foreground">Duration เฉลี่ย</div><div className="text-xl font-bold">{MA_DURATION.minutes} นาที</div></div>
          <div className="min-w-60 flex-1">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">Talk ratio เฉลี่ย</div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded"><div className="bg-success" style={{ width: `${MA_DURATION.bdPct}%` }} /><div className="flex-1 bg-destructive" /></div>
            <div className="mt-1 flex gap-4 text-xs"><span className="text-success">● <span className="text-foreground">BD {MA_DURATION.bdPct}%</span></span><span className="text-destructive">● <span className="text-foreground">ลูกค้า {MA_DURATION.customerPct}%</span></span></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-6 rounded-xl border bg-card p-5">
          <div>
            <h2 className="mb-3 font-semibold">Overall Score Performance</h2>
            <Bars testId="ma-overall" avg={one ? one.avg : MA_TILES.teamAvg} rows={bdRows.map((b) => ({ label: b.name, sub: `${b.meets} meet`, value: b.avg }))} />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Score Performance {sessionPerson}</h2>
              <Select label="เลือก BD" value={sessionPerson} onChange={setSessionPerson} options={MA_BD.map((b) => ({ v: b.name, l: b.name }))} />
            </div>
            <Bars testId="ma-sessions" avg={sessionAvg} rows={sessions.map((s) => ({ label: s.date, value: s.score }))} />
          </div>
        </section>

        <section className="flex flex-col rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Flag className="h-4 w-4 text-destructive" />Flag Alert Board</h2>
          <p className="mb-3 text-xs text-muted-foreground">รายการที่ต้อง coaching ก่อน · เรียงตาม severity</p>
          <div className="flex-1 space-y-2" data-testid="ma-flags">
            {shownFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1 text-xs"><div className="font-semibold text-destructive">{f.text}</div><div className="mt-1"><b>{f.hotel}</b> · <span className="text-muted-foreground">{f.bd}</span></div></div>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setOpen("history")}>ดูเพิ่มเติม</Button>
              </div>
            ))}
            {flags.length === 0 && <div className="text-sm text-muted-foreground">ไม่มี flag</div>}
          </div>
          <div className="mt-3 flex items-center justify-between">
            {!showAll ? (
              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => (
                  <Button key={i} size="sm" variant={i === page ? "default" : "outline"} className="h-7 w-7 p-0 text-xs" onClick={() => setPage(i)}>{i + 1}</Button>
                ))}
              </div>
            ) : <span />}
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setShowAll((s) => !s)}>{showAll ? "แสดงทีละหน้า" : "ดู flag ทั้งหมด"}</Button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Team Latest Score</h2>
        <p className="mb-2 text-xs text-muted-foreground">คะแนน QA session ล่าสุดของแต่ละคน</p>
        <div className="divide-y" data-testid="ma-latest">
          {latest.map((l, i) => (
            <div key={l.name} className="flex items-center gap-3 py-3">
              <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${toneText(l.score)} bg-muted`}>{l.name.charAt(0)}</span>
              <div className="flex-1 text-sm"><b>{l.name}</b><div className="text-xs text-muted-foreground">BD · {l.date} · <span className="text-primary">{l.hotel}</span></div></div>
              <div className="h-1.5 w-28 rounded bg-muted"><div className={`h-1.5 rounded ${tone(l.score)}`} style={{ width: `${l.score}%` }} /></div>
              <span className={`w-8 text-right font-bold ${toneText(l.score)}`}>{l.score}</span>
              <span className={`w-10 text-xs ${l.delta == null ? "" : l.delta < 0 ? "text-destructive" : "text-success"}`}>{l.delta == null ? "" : `${l.delta < 0 ? "▼" : "▲"}${Math.abs(l.delta)}`}</span>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "new" ? "New Analysis" : "History"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">เมนูนี้อยู่ระหว่างพัฒนา</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Tile({ value, chip, chipTone, label, testId }: { value: string; chip?: string; chipTone?: string; label: string; testId: string }) {
  return (
    <div className="rounded-xl border bg-card p-4" data-testid={testId}>
      <div className="text-3xl font-bold">{value}</div>
      {chip && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipTone}`}>{chip}</span>}
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
