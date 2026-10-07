/* PS App v5.0 · Phase 1 — Servicing re-design (day-count timeline, gates, surveys, disparity, KPI #4). */
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Plus, Search, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  fullSequence,
  STAGE_GUIDANCE,
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

const TRACK_COLOR: Record<OwnerTrack, string> = {
  AE: "var(--color-primary)",
  SPECIALIST: "var(--color-accent)",
  SERVICE: "var(--color-muted-foreground)",
};
const TRACK_LABEL: Record<OwnerTrack, string> = { AE: "AE", SPECIALIST: "Specialist", SERVICE: "Service" };
const ROLES: Role[] = ["ae", "specialist", "pm", "service", "management"];
const d = (n: number | null) => (n === null ? "—" : `D${n}`);

export function ServicingDashboard() {
  return <ServicingProvider><ServicingWorkSurface /></ServicingProvider>;
}

export function ServicingDashboardView() {
  return <ServicingProvider><ServicingMonitor /></ServicingProvider>;
}

function ServicingWorkSurface() {
  const s = useServicing();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const hash = useRouterState({ select: (state) => state.location.hash });
  useEffect(() => {
    const cardId = hash?.replace(/^#?servicing-card-/, "");
    if (cardId && s.cards.some((card) => card.id === cardId)) setOpenCard(cardId);
  }, [hash, s.cards]);
  return (
    <section id="servicing-pipeline" className="space-y-4 border-t pt-6" aria-label="Servicing workflow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Servicing Pipeline</h2>
            <p className="text-sm text-muted-foreground">ทำงานตามขั้นตอน ORM และ Marcom ภายในระบบ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={s.role} onValueChange={(v) => s.setRole(v as Role)}>
              <SelectTrigger aria-label="Servicing role" className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>Role: {r}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" disabled={s.role === "management"} onClick={() => setCreating(true)}><Plus className="size-4" /> Create card</Button>
          </div>
        </div>
        {!s.hydrated ? <p className="py-6 text-muted-foreground">กำลังโหลด…</p> : <FullPipeline onOpen={setOpenCard} />}
      <DetailSheet key={openCard ?? "closed"} id={openCard} onClose={() => setOpenCard(null)} />
      <CreateDialog open={creating} onClose={() => setCreating(false)} onCreated={setOpenCard} />
    </section>
  );
}

function ServicingMonitor() {
  const s = useServicing();
  const [view, setView] = useState("pipeline");
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");
  const [status, setStatus] = useState("all");
  const [compare, setCompare] = useState<string | null>(null);
  const filtered = useMemo(() => s.cards.filter((card) => {
    const term = q.trim().toLowerCase();
    const bucket = card.go_live_at ? "live" : AE_TRACK_STAGES.has(card.current_stage) ? "ae" : "servicing";
    return (!term || `${card.property_name} ${card.property_id} ${card.contract_ref}`.toLowerCase().includes(term))
      && (line === "all" || card.service_line === line)
      && (status === "all" || status === bucket);
  }), [s.cards, q, line, status]);
  const live = s.cards.filter((card) => card.go_live_at).length;
  const siblings = [...new Set(filtered.map((card) => card.property_id))]
    .map((id) => filtered.filter((card) => card.property_id === id))
    .filter((cards) => cards.length > 1);

  return (
    <section className="space-y-4 border-t pt-6" aria-label="Servicing overview">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Servicing</p>
        <h2 className="font-display text-xl font-semibold">ภาพรวม On-boarding และบริการ</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="การ์ดบริการทั้งหมด" value={s.cards.length} />
        <Kpi label="โรงแรม" value={new Set(s.cards.map((card) => card.property_id)).size} />
        <Kpi label="เปิดใช้งานแล้ว" value={live} />
        <Kpi label="กำลังดำเนินการ" value={s.cards.length - live} />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อหรือรหัสโรงแรม" className="pl-9" />
        </div>
        <Select value={line} onValueChange={setLine}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทุกบริการ</SelectItem><SelectItem value="ORM">ORM</SelectItem><SelectItem value="MARCOM">Marcom</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทุกสถานะ</SelectItem><SelectItem value="ae">AE track</SelectItem><SelectItem value="servicing">Servicing</SelectItem><SelectItem value="live">Go Live</SelectItem></SelectContent></Select>
      </div>
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit sm:grid-cols-4">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger><TabsTrigger value="tracking">Tracking</TabsTrigger><TabsTrigger value="disparity">Disparity</TabsTrigger><TabsTrigger value="kpi">KPI #4</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline"><CondensedPipeline cards={filtered} /></TabsContent>
        <TabsContent value="tracking"><TrackingView cards={filtered} onCompare={setCompare} /></TabsContent>
        <TabsContent value="disparity"><div className="divide-y rounded-lg border px-4">{siblings.map((cards) => <div key={cards[0]?.property_id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-medium">{cards[0]?.property_name}</span><div className="flex items-center gap-2"><DisparityBadge cards={cards} /><Button size="sm" variant="ghost" onClick={() => { const id = cards[0]?.property_id; if (id) setCompare(id); }}>Compare</Button></div></div>)}{!siblings.length && <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีโรงแรมหลายบริการในผลลัพธ์นี้</p>}</div></TabsContent>
        <TabsContent value="kpi"><KpiView onOpen={() => undefined} cards={filtered} /></TabsContent>
      </Tabs>
      <CompareDialog propertyId={compare} onClose={() => setCompare(null)} />
    </section>
  );
}

const AE_TRACK_STAGES = new Set(["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"]);

function WorkLink({ card, label = "View details" }: { card: OnboardingCard; label?: string }) {
  return <Button asChild size="sm" variant="ghost"><Link to="/ps/onboarding-process" hash={`servicing-card-${card.id}`}>{label} <ArrowRight className="size-3.5" /></Link></Button>;
}

function CondensedPipeline({ cards }: { cards: OnboardingCard[] }) {
  const stages = [...new Set(cards.map((card) => card.current_stage))];
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{stages.map((stage) => { const stageCards = cards.filter((card) => card.current_stage === stage); const sample = stageCards[0]; return <div key={stage} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{STAGE_LABEL[stage]}</p><p className="mt-1 text-xs text-muted-foreground">{sample ? TRACK_LABEL[trackForStage(sample, stage)] : "—"} · {stageCards.length} การ์ด</p></div><span className="font-display text-2xl font-bold tabular-nums">{stageCards.length}</span></div>{sample && <div className="mt-3 flex justify-end"><WorkLink card={sample} /></div>}</div>; })}{!stages.length && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่พบการ์ด</p>}</div>;
}

function TrackingView({ cards, onCompare }: { cards: OnboardingCard[]; onCompare: (id: string) => void }) {
  const groups = [...new Set(cards.map((card) => card.property_id))].map((id) => ({ id, cards: cards.filter((card) => card.property_id === id) }));
  return <div className="divide-y rounded-lg border">{groups.map(({ id, cards: group }) => <div key={id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{group[0]?.property_name}</p><div className="flex items-center gap-2"><DisparityBadge cards={group} />{group.length > 1 && <Button size="sm" variant="ghost" onClick={() => onCompare(id)}>Compare</Button>}</div></div><div className="mt-2 divide-y">{group.map((card) => <div key={card.id} className="flex flex-wrap items-center gap-3 py-2 text-sm"><Chip tone={card.service_line === "ORM" ? "info" : "muted"}>{card.service_line}</Chip><span className="flex-1">{STAGE_LABEL[card.current_stage]}</span><span className="font-mono text-xs text-muted-foreground">Day {currentDay(card)}</span><WorkLink card={card} /></div>)}</div></div>)}{!groups.length && <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบการ์ด</p>}</div>;
}

function trackForStage(_card: OnboardingCard, stage: string): OwnerTrack {
  if (AE_TRACK_STAGES.has(stage)) return "AE";
  if (stage === "approved" || stage === "completed") return "SPECIALIST";
  return "SERVICE";
}

function FullPipeline({ onOpen }: { onOpen: (id: string) => void }) {
  const s = useServicing();
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");
  const sequence = [...new Set(s.cards.flatMap((card) => fullSequence(card.service_line)))];
  const cards = s.cards.filter((card) => (!q || `${card.property_name} ${card.contract_ref}`.toLowerCase().includes(q.toLowerCase())) && (line === "all" || card.service_line === line));
  return <div className="space-y-3"><div className="flex flex-wrap gap-2"><div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาการ์ดบริการ" className="pl-9" /></div><Select value={line} onValueChange={setLine}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทุกบริการ</SelectItem><SelectItem value="ORM">ORM</SelectItem><SelectItem value="MARCOM">Marcom</SelectItem></SelectContent></Select></div><div className="overflow-x-auto pb-2"><div className="flex min-w-max gap-3">{sequence.map((stage) => { const stageCards = cards.filter((card) => card.current_stage === stage); return <div key={stage} className="w-[280px] shrink-0 rounded-lg border bg-card p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{STAGE_LABEL[stage]}</p><Chip tone="muted">{stageCards.length}</Chip></div><p className="mt-1 text-xs text-muted-foreground">Owner: {stageCards[0] ? TRACK_LABEL[trackForStage(stageCards[0], stage)] : "—"}</p><div className="mt-3 space-y-2">{stageCards.map((card) => <Button key={card.id} variant="ghost" onClick={() => onOpen(card.id)} className="h-auto min-h-16 w-full justify-start rounded-md border px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate text-sm font-medium">{card.property_name}</span><span className="mt-1 block text-xs text-muted-foreground">{card.service_line} · Day {currentDay(card)}</span></span></Button>)}{!stageCards.length && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">ว่าง</p>}</div></div>; })}</div></div><div className="rounded-lg border"><div className="border-b px-4 py-3"><p className="text-sm font-semibold">History</p><p className="text-xs text-muted-foreground">เหตุการณ์ล่าสุดจากการทำงานในระบบ</p></div><div className="divide-y">{[...s.events].sort((a, b) => b.entered_at.localeCompare(a.entered_at)).slice(0, 12).map((event) => { const card = s.cards.find((item) => item.id === event.card_id); return <div key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"><span className="min-w-[10rem] font-medium">{card?.property_name}</span><Chip tone="muted">{card?.service_line}</Chip><span className="flex-1">{STAGE_LABEL[event.stage_key]}</span><span className="font-mono text-xs text-muted-foreground">{fmtDayMon(event.entered_at)} · Day {card ? daysBetween(card.created_at, event.entered_at) : "—"}</span></div>; })}</div></div></div>;
}

/* ---------------- disparity (§5.8) ---------------- */

function disparity(cards: OnboardingCard[]) {
  if (cards.length < 2) return null;
  const lives = cards.map((c) => c.go_live_at).filter((x): x is string => !!x).sort();
  if (!lives.length) return { kind: "none" as const };
  const first = (lives[0] ?? "");
  if (lives.length < cards.length) return { kind: "live" as const, days: daysBetween(first, new Date()) };
  return { kind: "final" as const, days: daysBetween(first, (lives[lives.length - 1] ?? "")) };
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

/* ---------------- timeline (§5.2) ---------------- */

function Timeline({ card }: { card: OnboardingCard }) {
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
  const [showHistory, setShowHistory] = useState(false);
  if (!card) return null;

  const nxt = nextStage(card.service_line, card.current_stage);
  const gate = s.canAdvance(card.id);
  const missing = [...(nxt ? gate.reasons ?? [] : []), ...(nxt === "completed" && !/^https?:\/\//.test(meetUrl.trim()) ? ["Specialist: ใส่ลิงก์ Meeting record (http/https)"] : [])];
  const sequence = fullSequence(card.service_line);
  const future = sequence.slice(sequence.indexOf(card.current_stage === "property_pending" ? "collect_data" : card.current_stage) + 1);
  const finals = s.finalChecks.filter((f) => f.card_id === card.id);
  const hand = s.handover.filter((h) => h.card_id === card.id);
  const hs = s.handoverSurveys.find((h) => h.card_id === card.id);
  const cs = s.customerSurveys.find((c) => c.card_id === card.id);
  const doAdvance = (to?: string) => {
    const r = s.advance(card.id, { ...(to ? { to } : {}), ...(meetUrl ? { meetingUrl: meetUrl } : {}) });
    if (r.ok) toast.success(`เข้าสู่ ${STAGE_LABEL[to ?? nxt ?? ""]}`);
    else toast.info(r.error ?? "ยังเลื่อนไม่ได้");
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
          <section className="space-y-3 border-b pb-4" aria-label="Current step">
            <p className="text-xs text-muted-foreground">ขั้นตอนปัจจุบัน · Day {currentDay(card)}</p>
            <h3 className="font-display text-xl font-semibold">{STAGE_LABEL[card.current_stage]}</h3>
            <p className="text-sm">{STAGE_GUIDANCE[card.current_stage]}</p>
            <p className="text-xs text-muted-foreground">ผู้รับผิดชอบ: {card.current_stage === "approved" || card.current_stage === "final_check" ? "AE / Specialist / Service" : ["new_property", "introduction_sent_form", "collect_data", "property_pending"].includes(card.current_stage) ? card.assigned_ae_id : card.assigned_service_owner_id}</p>
            {nxt && <Button className="w-full sm:w-auto" disabled={missing.length > 0} onClick={() => doAdvance()}>{nxt === "approved" ? "Approve" : nxt === "completed" ? "Completed" : nxt === "go_live" ? "ยืนยัน Go Live" : `ทำขั้นนี้เสร็จ → ${STAGE_LABEL[nxt]}`}</Button>}
            {missing.length > 0 && <div className="border-l-2 pl-3 text-sm text-muted-foreground"><p className="font-medium text-foreground">สิ่งที่ต้องทำก่อนดำเนินการต่อ</p><ul className="mt-1 space-y-1">{missing.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
            {card.current_stage === "collect_data" && <Button variant="outline" disabled={s.role !== "ae" && s.role !== "pm"} onClick={() => doAdvance("property_pending")}>Mark Property Pending</Button>}
          </section>
          <SumChips card={card} />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Form (WS-2):</span>
            <Select disabled={!["ae", "pm"].includes(s.role)} value={card.form_completion_status} onValueChange={(v) => s.setFormStatus(card.id, v as typeof card.form_completion_status)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">not_started</SelectItem>
                <SelectItem value="in_progress">in_progress</SelectItem>
                <SelectItem value="complete">complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <section className="space-y-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(v => !v)}>{showHistory ? "ซ่อน" : "แสดง"}ขั้นตอนที่ผ่านมา · {eventsOf(s, card.id).length}</Button>
            {showHistory && <Timeline card={card} />}
            {future.length > 0 && <div className="border-l pl-4 text-xs text-muted-foreground"><p className="mb-2 font-medium">ขั้นตอนถัดไป</p><ol className="space-y-1.5">{future.map(stage => <li key={stage}>{MILESTONES.has(stage) ? "●" : "○"} {STAGE_LABEL[stage]}{stage === card.billing_anchor_stage ? " ★" : ""}</li>)}</ol></div>}
          </section>

          {card.current_stage === "final_check" && (
            <section className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Final Check (AE)</h3>
              <ul className="mt-2 space-y-1.5">
                {finals.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox aria-label={f.item_label} checked={f.checked} disabled={s.role !== "ae" && s.role !== "pm"} onCheckedChange={() => s.toggleFinalCheck(f.id)} />
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
                      <td className="py-1"><Input disabled={s.role === "management"} aria-label={`รายการ ${h.item_label}`} className="h-7 text-xs" value={h.item_label} onChange={(e) => s.editHandover(h.id, e.target.value)} /></td>
                      <td className="text-center"><Checkbox aria-label={`Specialist: ${h.item_label}`} checked={h.specialist_checked} disabled={s.role !== "specialist" && s.role !== "pm"} onCheckedChange={() => s.toggleHandover(h.id, "specialist")} /></td>
                      <td className="text-center"><Checkbox aria-label={`Service: ${h.item_label}`} checked={h.verifier_checked} disabled={s.role !== "service" && s.role !== "pm"} onCheckedChange={() => s.toggleHandover(h.id, "verifier")} /></td>
                      <td><Button disabled={s.role === "management"} aria-label="ลบรายการ Handover" title="ลบรายการ Handover" size="icon" variant="ghost" className="size-7" onClick={() => s.deleteHandover(h.id)}><Trash2 className="size-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex gap-2">
                <Input className="h-8 text-xs" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="เพิ่มรายการ" />
                <Button size="sm" variant="outline" disabled={!newItem.trim() || s.role === "management"} onClick={() => { s.addHandover(card.id, newItem.trim()); setNewItem(""); }}>เพิ่ม</Button>
              </div>
              <Input aria-label="Meeting record URL" className="mt-3 h-8 text-xs" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="Meeting record URL (จำเป็นตอน Completed)" />
            </section>
          )}


          {hs && <HandoverSurveyForm key={hs.id} id={hs.id} status={surveyStatus(hs)} score={hs.score} />}
          {cs && <CustomerSurveyForm key={cs.id} id={cs.id} responded={!!cs.responded_at} />}
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
          <Button variant="outline" size="sm" disabled={s.role !== "service" && s.role !== "pm"} onClick={() => { s.submitHandoverSurvey(id, v, c); toast.success("ส่ง Survey #1 แล้ว"); }}>
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
        <Button
          variant="outline"
          aria-pressed={value === n}
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn("size-7 rounded-md border text-xs", value === n ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          {n}
        </Button>
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
  const cycleGap = overalls.every((o): o is number => o !== null) ? Math.max(...overalls) - Math.min(...overalls) : null;
  const min = Math.min(...cards.map((c) => new Date(c.created_at).getTime()));
  const max = Math.max(...cards.map((c) => new Date(c.go_live_at ?? Date.now()).getTime()));
  const pct = (iso: string | number) => ((new Date(iso).getTime() - min) / Math.max(1, max - min)) * 100;
  const lives = cards.map((c) => c.go_live_at).filter((x): x is string => !!x).sort();

  return (
    <Dialog open={!!propertyId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sibling compare · {cards[0]?.property_name}</DialogTitle>
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
              style={{ left: `${pct((lives[0] ?? ""))}%`, width: `${pct(lives.length === cards.length ? (lives[lives.length - 1] ?? "") : Date.now()) - pct((lives[0] ?? ""))}%` }}
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

function KpiView({ onOpen, cards }: { onOpen: (id: string) => void; cards?: OnboardingCard[] }) {
  const s = useServicing();
  const [line, setLine] = useState<ServiceLine>("ORM");
  const rows = (cards ?? s.cards)
    .filter((c) => c.service_line === line && c.go_live_at)
    .map((c) => {
      const v = sums(c, eventsOf(s, c.id));
      return { card: c, ...v, bottleneck: bottleneck(v), x: new Date(c.go_live_at ?? c.created_at).getTime(), y: v.overall ?? 0 };
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
