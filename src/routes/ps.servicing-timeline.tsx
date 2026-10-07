/* PS App v5.0 · Phase 1 — Servicing re-design (day-count timeline, gates, surveys, disparity, KPI #4). */
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Chip, Kpi, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  MILESTONES,
  STAGE_LABEL,
  ServicingProvider,
  bottleneck,
  currentDay,
  daysBetween,
  eventsOf,
  fmtDayMon,
  nextStage,
  quantile,
  sums,
  surveyStatus,
  useServicing,
  type OnboardingCard,
  type OwnerTrack,
  type Role,
  type ServiceLine,
} from "@/lib/ps-servicing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/servicing-timeline")({
  head: () => ({
    meta: [
      { title: "Servicing Timeline — PS App | Meridia Hotel ERP" },
      { name: "description", content: "Day-count timeline ของการ On-boarding ต่อ service line พร้อม handover gate, survey, disparity และ KPI distribution" },
      { property: "og:title", content: "Servicing Timeline — PS App" },
      { property: "og:description", content: "Cumulative day-count timeline, disparity และ KPI outliers สำหรับ ORM / Marcom" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ServicingProvider>
      <ServicingPage />
    </ServicingProvider>
  ),
});

const TRACK_COLOR: Record<OwnerTrack, string> = {
  AE: "var(--color-primary)",
  SPECIALIST: "var(--color-accent)",
  SERVICE: "var(--color-muted-foreground)",
};
const TRACK_LABEL: Record<OwnerTrack, string> = { AE: "AE", SPECIALIST: "Specialist", SERVICE: "Service" };
const ROLES: Role[] = ["ae", "specialist", "pm", "service", "management"];
const d = (n: number | null) => (n === null ? "—" : `D${n}`);

function ServicingPage() {
  const s = useServicing();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [compare, setCompare] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Servicing Timeline"
        description="นับวันสะสมจากวันสร้างการ์ด (Day 0) · ไม่มี deadline · 1 service line = 1 การ์ด"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={s.role} onValueChange={(v) => s.setRole(v as Role)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    Role: {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => { s.reset(); toast.success("รีเซ็ตข้อมูลตัวอย่างแล้ว"); }}>
              <RotateCcw className="size-4" /> Reset seed
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> สร้างการ์ด
            </Button>
          </div>
        }
      />
      {!s.hydrated ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">กำลังโหลด…</p>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="kpi">KPI #4 · Distribution</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <Overview onOpen={setOpenCard} onCompare={setCompare} />
          </TabsContent>
          <TabsContent value="kpi" className="mt-4">
            <KpiView onOpen={setOpenCard} />
          </TabsContent>
        </Tabs>
      )}
      <DetailSheet id={openCard} onClose={() => setOpenCard(null)} />
      <CompareDialog propertyId={compare} onClose={() => setCompare(null)} />
      <CreateDialog open={creating} onClose={() => setCreating(false)} onCreated={setOpenCard} />
    </div>
  );
}

/* ---------------- disparity (§5.8) ---------------- */

function disparity(cards: OnboardingCard[]) {
  if (cards.length < 2) return null;
  const lives = cards.map((c) => c.go_live_at).filter((x): x is string => !!x).sort();
  if (!lives.length) return { kind: "none" as const };
  const first = lives[0]!;
  if (lives.length < cards.length) return { kind: "live" as const, days: daysBetween(first, new Date()) };
  return { kind: "final" as const, days: daysBetween(first, lives[lives.length - 1]!) };
}
function DisparityBadge({ cards }: { cards: OnboardingCard[] }) {
  const dp = disparity(cards);
  if (!dp || dp.kind === "none") return null;
  return dp.kind === "live" ? (
    <Chip tone="info">⟳ exposure {dp.days} วัน (live)</Chip>
  ) : (
    <Chip>Go-Live gap {dp.days} วัน (final)</Chip>
  );
}

/* ---------------- overview (§5.7) ---------------- */

function Overview({ onOpen, onCompare }: { onOpen: (id: string) => void; onCompare: (pid: string) => void }) {
  const s = useServicing();
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");
  const [status, setStatus] = useState("all");

  const groups = useMemo(() => {
    const filtered = s.cards.filter((c) => {
      if (line !== "all" && c.service_line !== line) return false;
      const st = c.go_live_at ? "live" : ["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"].includes(c.current_stage) ? "ae" : "servicing";
      if (status !== "all" && st !== status) return false;
      return c.property_name.toLowerCase().includes(q.toLowerCase());
    });
    const map = new Map<string, OnboardingCard[]>();
    filtered.forEach((c) => map.set(c.property_id, [...(map.get(c.property_id) ?? []), c]));
    return [...map.entries()];
  }, [s.cards, q, line, status]);

  const live = s.cards.filter((c) => c.go_live_at).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Cards" value={s.cards.length} />
        <Kpi label="Hotels" value={new Set(s.cards.map((c) => c.property_id)).size} />
        <Kpi label="Go Live" value={live} />
        <Kpi label="In progress" value={s.cards.length - live} />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาโรงแรม" className="h-9 w-64 pl-8" />
        </div>
        <Select value={line} onValueChange={setLine}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก service line</SelectItem>
            <SelectItem value="ORM">ORM</SelectItem>
            <SelectItem value="MARCOM">Marcom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="ae">AE track</SelectItem>
            <SelectItem value="servicing">Servicing</SelectItem>
            <SelectItem value="live">Go Live</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        {!groups.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่พบการ์ด</p>}
        {groups.map(([pid, cards]) => {
          const all = s.cards.filter((c) => c.property_id === pid);
          return (
            <div key={pid} className="card-elevated p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="font-display font-semibold">{cards[0]!.property_name}</p>
                <div className="flex items-center gap-2">
                  <DisparityBadge cards={all} />
                  {all.length >= 2 && (
                    <Button size="sm" variant="ghost" onClick={() => onCompare(pid)}>Compare</Button>
                  )}
                </div>
              </div>
              <div className="mt-2 divide-y rounded-lg border">
                {cards.map((c) => (
                  <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <Chip tone={c.service_line === "ORM" ? "info" : "muted"}>{c.service_line}</Chip>
                    <span className="text-xs text-muted-foreground">{c.contract_ref}</span>
                    <span className="flex-1">{STAGE_LABEL[c.current_stage]}</span>
                    {c.billing_start_at && <Star className="size-3.5 text-muted-foreground" />}
                    <span className="font-mono text-xs tabular-nums">{c.go_live_at ? `Live · D${currentDay(c)}` : `Day ${currentDay(c)}`}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- timeline (§5.2) ---------------- */

function Timeline({ card, editable }: { card: OnboardingCard; editable?: boolean }) {
  const s = useServicing();
  const evs = eventsOf(s, card.id);
  const hs = s.handoverSurveys.find((h) => h.card_id === card.id);
  return (
    <ol className="relative ml-2 border-l pl-4">
      {evs.map((e, i) => {
        const big = MILESTONES.has(e.stage_key);
        const isActive = i === evs.length - 1 && !card.go_live_at;
        const dayN = daysBetween(card.created_at, e.entered_at);
        return (
          <li key={e.id} className="relative pb-3">
            <span
              className={cn(
                "absolute top-1 rounded-full border-2 border-foreground/70 bg-background",
                big ? "-left-[25px] size-4 bg-foreground/80" : "-left-[21px] size-2.5",
              )}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn(big && "font-semibold")}>{STAGE_LABEL[e.stage_key]}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {fmtDayMon(e.entered_at)} · Day {dayN}
              </span>
              <span className="text-[10px] text-muted-foreground">{TRACK_LABEL[e.owner_track]}</span>
              {e.stage_key === card.billing_anchor_stage && <Chip>★ Billing start</Chip>}
              {e.stage_key === "completed" && hs && <SurveyBadge status={surveyStatus(hs)} expires={hs.window_expires_at} />}
              {e.stage_key === card.billing_anchor_stage && <Chip>◇ Survey #2 sent</Chip>}
              {isActive && <span className="text-xs text-muted-foreground">· live: Day {currentDay(card)}</span>}
            </div>
            {editable && i > 0 && (
              <Input
                type="date"
                className="mt-1 h-7 w-40 text-xs"
                value={e.entered_at.slice(0, 10)}
                onChange={(ev) => ev.target.value && s.setEventDate(e.id, new Date(ev.target.value + "T09:00:00").toISOString())}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SurveyBadge({ status, expires }: { status: string; expires: string }) {
  if (status === "submitted") return <Chip>◇ Survey #1 submitted</Chip>;
  if (status === "expired") return <Chip>◇ Survey #1 expired</Chip>;
  const left = Math.max(0, daysBetween(new Date(), expires));
  return <Chip>◇ score within {left} days</Chip>;
}

function SumChips({ card }: { card: OnboardingCard }) {
  const s = useServicing();
  const v = sums(card, eventsOf(s, card.id));
  return (
    <div className="flex flex-wrap gap-2">
      {[
        ["Σ AE", v.ae],
        ["Σ Specialist", v.specialist],
        ["Σ Service", v.service],
        ["Overall", v.overall],
      ].map(([l, n]) => (
        <div key={l as string} className="rounded-lg border bg-surface/50 px-3 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
          <p className="font-display font-bold tabular-nums">{n === null ? "—" : `${n} วัน`}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- detail sheet ---------------- */

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useServicing();
  const card = s.cards.find((c) => c.id === id);
  const [meetUrl, setMeetUrl] = useState("");
  const [newItem, setNewItem] = useState("");
  const [editTimes, setEditTimes] = useState(false);
  if (!card) return null;

  const nxt = nextStage(card.service_line, card.current_stage);
  const gate = s.canAdvance(card.id);
  const finals = s.finalChecks.filter((f) => f.card_id === card.id);
  const hand = s.handover.filter((h) => h.card_id === card.id);
  const hs = s.handoverSurveys.find((h) => h.card_id === card.id);
  const cs = s.customerSurveys.find((c) => c.card_id === card.id);
  const doAdvance = (to?: string) => {
    const r = s.advance(card.id, { ...(to ? { to } : {}), ...(meetUrl ? { meetingUrl: meetUrl } : {}) });
    if (r.ok) toast.success(`เข้าสู่ ${STAGE_LABEL[to ?? nxt ?? ""]}`);
    else toast.error(r.error ?? "ยังเลื่อนไม่ได้");
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {card.property_name} · {card.service_line} {card.contract_ref}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5 px-1 pb-8">
          <SumChips card={card} />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Form (WS-2):</span>
            <Select value={card.form_completion_status} onValueChange={(v) => s.setFormStatus(card.id, v as typeof card.form_completion_status)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">not_started</SelectItem>
                <SelectItem value="in_progress">in_progress</SelectItem>
                <SelectItem value="complete">complete</SelectItem>
              </SelectContent>
            </Select>
            <label className="ml-auto flex items-center gap-1.5">
              <Checkbox checked={editTimes} onCheckedChange={(v) => setEditTimes(!!v)} /> แก้วันที่ (mock sync)
            </label>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Timeline</h3>
            <Timeline card={card} editable={editTimes} />
          </section>

          {card.current_stage === "final_check" && (
            <section className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Final Check (AE)</h3>
              <ul className="mt-2 space-y-1.5">
                {finals.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={f.checked} disabled={s.role !== "ae" && s.role !== "pm"} onCheckedChange={() => s.toggleFinalCheck(f.id)} />
                      {f.item_label}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-muted-foreground">AE ติ๊ก · Specialist (หรือ PM) เป็นผู้กด Approve</p>
            </section>
          )}

          {card.current_stage === "approved" && (
            <section className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Handover checklist · 2-tick</h3>
              <table className="mt-2 w-full text-sm">
                <thead className="text-[11px] text-muted-foreground">
                  <tr><th className="text-left">Item</th><th>Specialist</th><th>Service</th><th /></tr>
                </thead>
                <tbody>
                  {hand.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="py-1"><Input className="h-7 text-xs" value={h.item_label} onChange={(e) => s.editHandover(h.id, e.target.value)} /></td>
                      <td className="text-center"><Checkbox checked={h.specialist_checked} disabled={s.role !== "specialist" && s.role !== "pm"} onCheckedChange={() => s.toggleHandover(h.id, "specialist")} /></td>
                      <td className="text-center"><Checkbox checked={h.verifier_checked} disabled={s.role !== "service" && s.role !== "pm"} onCheckedChange={() => s.toggleHandover(h.id, "verifier")} /></td>
                      <td><Button size="icon" variant="ghost" className="size-7" onClick={() => s.deleteHandover(h.id)}><Trash2 className="size-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex gap-2">
                <Input className="h-8 text-xs" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="เพิ่มรายการ" />
                <Button size="sm" variant="outline" disabled={!newItem.trim()} onClick={() => { s.addHandover(card.id, newItem.trim()); setNewItem(""); }}>เพิ่ม</Button>
              </div>
              <Input className="mt-3 h-8 text-xs" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="Meeting record URL (จำเป็นตอน Completed)" />
            </section>
          )}

          {nxt && (
            <section className="flex flex-wrap items-center gap-2">
              <Button
                disabled={!gate.ok || (nxt === "completed" && !meetUrl.trim())}
                title={gate.reason}
                onClick={() => doAdvance()}
              >
                {nxt === "approved" ? "Approve" : nxt === "completed" ? "Completed" : `Advance → ${STAGE_LABEL[nxt]}`}
              </Button>
              {card.current_stage === "collect_data" && (
                <Button variant="outline" onClick={() => doAdvance("property_pending")}>Mark Property Pending</Button>
              )}
              {!gate.ok && <span className="text-xs text-muted-foreground">{gate.reason}</span>}
              {gate.ok && nxt === "completed" && !meetUrl.trim() && <span className="text-xs text-muted-foreground">ใส่ลิงก์ Meeting record ก่อน</span>}
            </section>
          )}

          {hs && <HandoverSurveyForm id={hs.id} status={surveyStatus(hs)} score={hs.score} />}
          {cs && <CustomerSurveyForm id={cs.id} responded={!!cs.responded_at} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HandoverSurveyForm({ id, status, score }: { id: string; status: string; score: number | null }) {
  const s = useServicing();
  const [v, setV] = useState(4);
  const [c, setC] = useState("");
  return (
    <section className="rounded-lg border p-3 text-sm">
      <h3 className="font-semibold">◇ Survey #1 · Handover (internal)</h3>
      {status === "submitted" ? (
        <p className="mt-1 text-muted-foreground">ส่งแล้ว · คะแนน {score}/5</p>
      ) : status === "expired" ? (
        <p className="mt-1 text-muted-foreground">หมดช่วงประเมิน 7 วัน (ไม่กระทบ pipeline)</p>
      ) : (
        <div className="mt-2 space-y-2">
          <ScorePicker value={v} onChange={setV} max={5} />
          <Textarea value={c} onChange={(e) => setC(e.target.value)} placeholder="ความคิดเห็น (ไม่บังคับ)" />
          <Button size="sm" disabled={s.role !== "service" && s.role !== "pm"} onClick={() => { s.submitHandoverSurvey(id, v, c); toast.success("ส่ง Survey #1 แล้ว"); }}>
            ส่งคะแนน (Service)
          </Button>
        </div>
      )}
    </section>
  );
}

function CustomerSurveyForm({ id, responded }: { id: string; responded: boolean }) {
  const s = useServicing();
  const [f, setF] = useState({ score_bd: 4, score_ae: 4, score_service_exp: 4, score_strategy: 4, nps: 8, comment: "" });
  return (
    <section className="rounded-lg border p-3 text-sm">
      <h3 className="font-semibold">◇ Survey #2 · Customer (optional)</h3>
      {responded ? (
        <p className="mt-1 text-muted-foreground">ลูกค้าตอบแล้ว</p>
      ) : (
        <div className="mt-2 space-y-2">
          {([
            ["score_bd", "BD"],
            ["score_ae", "AE"],
            ["score_service_exp", "Service experience"],
            ["score_strategy", "Strategy"],
          ] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-xs">{l}</span>
              <ScorePicker value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} max={5} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs">NPS</span>
            <ScorePicker value={f.nps} onChange={(n) => setF({ ...f, nps: n })} max={10} min={0} />
          </div>
          <Textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="ความคิดเห็น" />
          <Button size="sm" variant="outline" onClick={() => { s.submitCustomerSurvey(id, f); toast.success("บันทึก Survey #2 แล้ว"); }}>
            บันทึกคำตอบลูกค้า
          </Button>
        </div>
      )}
    </section>
  );
}

function ScorePicker({ value, onChange, max, min = 1 }: { value: number; onChange: (n: number) => void; max: number; min?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn("size-7 rounded-md border text-xs", value === n ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ---------------- compare (§5.8) ---------------- */

function CompareDialog({ propertyId, onClose }: { propertyId: string | null; onClose: () => void }) {
  const s = useServicing();
  const cards = s.cards.filter((c) => c.property_id === propertyId);
  if (cards.length < 2) return null;
  const dp = disparity(cards);
  const overalls = cards.map((c) => sums(c, eventsOf(s, c.id)).overall);
  const cycleGap = overalls.every((o) => o !== null) ? Math.abs(overalls[1]! - overalls[0]!) : null;
  const min = Math.min(...cards.map((c) => new Date(c.created_at).getTime()));
  const max = Math.max(...cards.map((c) => new Date(c.go_live_at ?? Date.now()).getTime()));
  const pct = (iso: string | number) => ((new Date(iso).getTime() - min) / Math.max(1, max - min)) * 100;
  const lives = cards.map((c) => c.go_live_at).filter((x): x is string => !!x).sort();

  return (
    <Dialog open={!!propertyId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sibling compare · {cards[0]!.property_name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip tone="info">
            (A) Go-Live gap: {dp?.kind === "live" ? `⟳ ${dp.days} วัน (live)` : dp?.kind === "final" ? `${dp.days} วัน (final)` : "ยังไม่มีการ์ด Live"}
          </Chip>
          <Chip>(B) Cycle-time gap: {cycleGap === null ? "—" : `${cycleGap} วัน`}</Chip>
        </div>
        <div className="relative mt-4 space-y-6 py-2">
          {lives.length >= 1 && (
            <div
              className="absolute inset-y-0 bg-muted/60"
              style={{ left: `${pct(lives[0]!)}%`, width: `${pct(lives.length === cards.length ? lives[lives.length - 1]! : Date.now()) - pct(lives[0]!)}%` }}
            />
          )}
          {cards.map((c) => (
            <div key={c.id} className="relative">
              <p className="mb-1 text-xs font-semibold">{c.service_line} {c.contract_ref} · {c.go_live_at ? `Live D${currentDay(c)}` : `Day ${currentDay(c)}`}</p>
              <div className="relative h-4">
                <div className="absolute top-1.5 h-0.5 bg-border" style={{ left: `${pct(c.created_at)}%`, right: `${100 - pct(c.go_live_at ?? Date.now())}%` }} />
                {eventsOf(s, c.id).map((e) => (
                  <span
                    key={e.id}
                    title={`${STAGE_LABEL[e.stage_key]} · ${fmtDayMon(e.entered_at)}`}
                    className={cn("absolute -translate-x-1/2 rounded-full bg-foreground/70", MILESTONES.has(e.stage_key) ? "top-0 size-4" : "top-1 size-2")}
                    style={{ left: `${pct(e.entered_at)}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">แถบเทา = ช่วง exposure ระหว่าง Go-Live ของการ์ดแรกถึงการ์ดสุดท้าย (หรือวันนี้ถ้ายังไม่ Live ครบ)</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- KPI #4 (§5.9) ---------------- */

function KpiView({ onOpen }: { onOpen: (id: string) => void }) {
  const s = useServicing();
  const [line, setLine] = useState<ServiceLine>("ORM");
  const rows = s.cards
    .filter((c) => c.service_line === line && c.go_live_at)
    .map((c) => {
      const v = sums(c, eventsOf(s, c.id));
      return { card: c, ...v, bottleneck: bottleneck(v), x: new Date(c.go_live_at!).getTime(), y: v.overall ?? 0 };
    });
  const ys = rows.map((r) => r.y).sort((a, b) => a - b);
  const med = quantile(ys, 0.5);
  const q1 = quantile(ys, 0.25);
  const q3 = quantile(ys, 0.75);
  const fence = q3 + 1.5 * (q3 - q1);
  const data = rows.map((r) => ({ ...r, outlier: r.y > fence }));
  const outliers = data.filter((r) => r.outlier).length;
  const sorted = [...data].sort((a, b) => b.y - a.y);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={line} onValueChange={(v) => setLine(v as ServiceLine)}>
          <TabsList>
            <TabsTrigger value="ORM">ORM</TabsTrigger>
            <TabsTrigger value="MARCOM">Marcom</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="font-display text-lg font-bold">
          median D{Math.round(med)} · {outliers} outliers
        </p>
        <span className="text-xs text-muted-foreground">IQR D{Math.round(q1)}–D{Math.round(q3)} · fence D{Math.round(fence)}</span>
      </div>
      <Panel title="Overall days vs Go-Live date" subtitle="สีจุด = owner ที่ Σ มากที่สุด · ✕ = เกิน upper fence (Q3 + 1.5·IQR)">
        {!data.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีการ์ด Go Live</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={["dataMin - 86400000*5", "dataMax + 86400000*5"]}
                  tickFormatter={(t: number) => fmtDayMon(new Date(t).toISOString())}
                  fontSize={11}
                />
                <YAxis type="number" dataKey="y" fontSize={11} domain={[0, (max: number) => Math.max(max, fence) + 10]} />
                <ReferenceArea y1={q1} y2={q3} fill="var(--color-muted)" fillOpacity={0.6} />
                <ReferenceLine y={med} stroke="var(--color-foreground)" label={{ value: `median D${Math.round(med)}`, fontSize: 10, position: "insideTopLeft" }} />
                <ReferenceLine y={fence} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" label={{ value: "fence", fontSize: 10, position: "insideTopLeft" }} />
                <RTooltip
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                    return p ? (
                      <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow">
                        {p.card.property_name} · D{p.y} · {p.bottleneck ? TRACK_LABEL[p.bottleneck] : "—"}
                      </div>
                    ) : null;
                  }}
                />
                <Scatter
                  data={data}
                  onClick={(p: { card?: OnboardingCard }) => p.card && onOpen(p.card.id)}
                  shape={(props: { cx?: number; cy?: number; payload?: (typeof data)[number] }) => {
                    const { cx = 0, cy = 0, payload } = props;
                    const color = payload?.bottleneck ? TRACK_COLOR[payload.bottleneck] : "var(--color-muted-foreground)";
                    return payload?.outlier ? (
                      <g stroke={color} strokeWidth={2.5}>
                        <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
                        <line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy - 6} />
                      </g>
                    ) : (
                      <circle cx={cx} cy={cy} r={6} fill={color} />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex gap-3 text-xs">
          {(Object.keys(TRACK_COLOR) as OwnerTrack[]).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="size-2.5 rounded-full" style={{ background: TRACK_COLOR[t] }} /> {TRACK_LABEL[t]}
            </span>
          ))}
        </div>
      </Panel>
      <Panel title="Drill-down" subtitle="เรียงตาม Overall มากไปน้อย">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Hotel</th><th>Service</th><th>Σ AE</th><th>Σ Specialist</th><th>Σ Service</th><th>Overall</th><th>Bottleneck</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.card.id} className={cn("cursor-pointer border-t hover:bg-muted/50", r.outlier && "bg-muted/60 font-semibold")} onClick={() => onOpen(r.card.id)}>
                  <td className="py-1.5">{r.card.property_name}</td>
                  <td>{r.card.service_line}</td>
                  <td className="tabular-nums">{d(r.ae)}</td>
                  <td className="tabular-nums">{d(r.specialist)}</td>
                  <td className="tabular-nums">{d(r.service)}</td>
                  <td className="tabular-nums">{d(r.overall)}</td>
                  <td>{r.bottleneck ? TRACK_LABEL[r.bottleneck] : "—"}</td>
                  <td>{r.outlier ? "✕ Outlier" : "In range"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- create ---------------- */

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const s = useServicing();
  const [name, setName] = useState("");
  const [line, setLine] = useState<ServiceLine>("ORM");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างการ์ด On-boarding</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อโรงแรม (ชื่อเดิม = การ์ดพี่น้อง)" />
          <Select value={line} onValueChange={(v) => setLine(v as ServiceLine)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ORM">ORM</SelectItem>
              <SelectItem value="MARCOM">Marcom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              const id = s.createCard({ property_name: name.trim(), service_line: line });
              toast.success("สร้างการ์ดแล้ว · Day 0");
              setName("");
              onClose();
              onCreated(id);
            }}
          >
            สร้าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
