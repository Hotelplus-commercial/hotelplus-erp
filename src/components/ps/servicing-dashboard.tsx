/* PS App v5.0 · Phase 1 — Servicing re-design (day-count timeline, gates, surveys, disparity, KPI #4). */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Plus, Search, Star, Trash2 } from "lucide-react";
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
  externalAppFor,
  fullSequence,
  STAGE_GUIDANCE,
  STAGE_LABEL,
  bottleneck,
  currentDay,
  daysBetween,
  CURRENT_AE,
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
  type ServiceVariant,
  lineSequence,
  specialistHandoverOpen,
  deptBadge,
  OTA_CHANNELS,
  handoverOtas,
  handoverProgress,
} from "@/lib/ps-servicing";
import { cn } from "@/lib/utils";
import { Ws2Panel } from "@/components/ps/ws2-panel";

const TRACK_COLOR: Record<OwnerTrack, string> = {
  AE: "var(--color-primary)",
  SPECIALIST: "var(--color-accent)",
  SERVICE: "var(--color-muted-foreground)",
};
const TRACK_LABEL: Record<OwnerTrack, string> = { AE: "AE", SPECIALIST: "Specialist", SERVICE: "Service" };
const ROLES: Role[] = ["ae", "specialist", "pm", "service", "management"];
const d = (n: number | null) => (n === null ? "—" : `D${n}`);

export function ServicingDashboard() {
  return <ServicingWorkSurface />;
}

export function ServicingDashboardView() {
  return <ServicingMonitor />;
}

function ServicingWorkSurface() {
  const s = useServicing();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openReadOnly, setOpenReadOnly] = useState(false);
  const [focusStage, setFocusStage] = useState<string | null>(null);
  const [fromZone3, setFromZone3] = useState(false);
  const hash = useRouterState({ select: (state) => state.location.hash });
  useEffect(() => {
    const landing = /^#?z3-(work|view)-(.+)$/.exec(hash ?? "");
    const cardId = landing?.[2] ?? hash?.replace(/^#?servicing-card-/, "");
    const card = s.cards.find((item) => item.id === cardId);
    if (!card) return;
    setFocusStage(card.current_stage);
    setOpenReadOnly(landing?.[1] === "view");
    setFromZone3(!!landing);
    if (landing?.[1] === "work") s.setRole("ae");
    setOpenCard(card.id);
  }, [hash, s.hydrated]);
  const openFromBoard = (id: string) => { setOpenReadOnly(false); setOpenCard(id); };
  return (
    <section id="servicing-pipeline" className="space-y-4 border-t pt-6" aria-label="Servicing workflow">
        {fromZone3 && <Button asChild variant="ghost" size="sm" className="px-0"><Link to="/ps/ae-workspace/dashboard">← กลับงานของฉัน (Zone 3)</Link></Button>}
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
        {!s.hydrated ? <p className="py-6 text-muted-foreground">กำลังโหลด…</p> : <FullPipeline onOpen={openFromBoard} focusStage={focusStage} landingKey={fromZone3 ? hash : ""} />}
      <ServicingCardDrawer key={openCard ?? "closed"} id={openCard} readOnly={openReadOnly} onClose={() => setOpenCard(null)} />
      <CreateDialog open={creating} onClose={() => setCreating(false)} onCreated={openFromBoard} />
    </section>
  );
}

function ServicingMonitor() {
  const s = useServicing();
  const [view, setView] = useState("pipeline");
  const [q, setQ] = useState("");
  const [line, setLine] = useState("ORM");
  const [status, setStatus] = useState("all");
  const [compare, setCompare] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const filtered = useMemo(() => s.cards.filter((card) => {
    const term = q.trim().toLowerCase();
    const bucket = card.go_live_at ? "live" : AE_TRACK_STAGES.has(card.current_stage) ? "ae" : "servicing";
    return (!term || `${card.property_name} ${card.property_id} ${card.contract_ref}`.toLowerCase().includes(term))
      && card.service_line === line
      && (status === "all" || status === bucket);
  }), [s.cards, q, line, status]);
  const live = s.cards.filter((card) => card.go_live_at).length;
  const siblings = [...new Set(filtered.map((card) => card.property_id))]
    .map((id) => filtered.filter((card) => card.property_id === id))
    .filter((cards) => cards.length > 1);

  return (
    <section id="servicing-overview" className="scroll-mt-20 space-y-4 border-t pt-6" aria-label="Servicing overview">
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
        <TabsContent value="pipeline"><CondensedPipeline cards={filtered} onOpen={setOpenCard} /></TabsContent>
        <TabsContent value="tracking"><TrackingView cards={filtered} onCompare={setCompare} onOpen={setOpenCard} /></TabsContent>
        <TabsContent value="disparity"><div className="divide-y rounded-lg border px-4">{siblings.map((cards) => <div key={cards[0]?.property_id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-medium">{cards[0]?.property_name}</span><div className="flex items-center gap-2"><DisparityBadge cards={cards} /><Button size="sm" variant="ghost" onClick={() => { const id = cards[0]?.property_id; if (id) setCompare(id); }}>Compare</Button></div></div>)}{!siblings.length && <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีโรงแรมหลายบริการในผลลัพธ์นี้</p>}</div></TabsContent>
        <TabsContent value="kpi"><KpiView cards={filtered} /></TabsContent>
      </Tabs>
      <CompareDialog propertyId={compare} onClose={() => setCompare(null)} />
      <ServicingCardDrawer key={openCard ?? "closed"} id={openCard} readOnly onClose={() => setOpenCard(null)} />
    </section>
  );
}

const AE_TRACK_STAGES = new Set(["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"]);

function WorkLink({ card, onOpen, label = "ดูรายละเอียดเพิ่มเติม" }: { card: OnboardingCard; onOpen: (id: string) => void; label?: string }) {
  return <Button size="sm" variant="ghost" onClick={() => onOpen(card.id)}>{label} <ArrowRight className="size-3.5" /></Button>;
}

/** View-only board: never advances a stage — advancing happens only inside ServicingCardDrawer. */
function CondensedPipeline({ cards, onOpen }: { cards: OnboardingCard[]; onOpen: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [line, setLine] = useState<ServiceLine>("ORM");
  const stages = lineSequence(line);
  const all = cards;
  cards = all.filter((card) => card.service_line === line);
  return <div className="space-y-3"><LineToggle value={line} onChange={setLine} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{stages.map((stage) => {
    const stageCards = cards.filter((card) => card.current_stage === stage);
    const sample = stageCards[0];
    return <div key={stage} className="rounded-lg border p-4">
      <Button variant="ghost" className="h-auto w-full justify-between gap-3 px-0 text-left" aria-expanded={expanded === stage} onClick={() => setExpanded(expanded === stage ? null : stage)}>
        <span><span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{STAGE_LABEL[stage]}<DeptBadge stage={stage} line={line} /></span><span className="mt-1 block text-xs text-muted-foreground">{sample ? TRACK_LABEL[trackForStage(sample, stage)] : "—"} · {stageCards.length} การ์ด</span></span>
        <span className="font-display text-2xl font-bold tabular-nums">{stageCards.length}</span>
      </Button>
      {expanded === stage ? <div className="mt-3 divide-y">{stageCards.map((card) => <div key={card.id} className="space-y-2 py-3">
        <p className="text-sm font-medium">{card.property_name} · {card.service_line}</p>
        <p className="text-xs text-muted-foreground">{STAGE_LABEL[card.current_stage]} · {trackForStage(card, stage) === "SERVICE" ? card.assigned_service_owner_id : TRACK_LABEL[trackForStage(card, stage)]}</p>
        <div className="flex flex-wrap gap-2"><WorkLink card={card} onOpen={onOpen} /><ExternalAppButton card={card} /></div>
      </div>)}</div> : sample && <div className="mt-3 flex justify-end"><WorkLink card={sample} onOpen={onOpen} /></div>}
    </div>;
  })}{!cards.length && <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่พบการ์ด</p>}</div></div>;
}

function LineToggle({ value, onChange }: { value: ServiceLine; onChange: (v: ServiceLine) => void }) {
  return <div role="group" aria-label="เลือกบริการ" className="inline-flex rounded-full border p-0.5">{(["ORM", "MARCOM"] as const).map((v) => <Button key={v} size="sm" variant={value === v ? "default" : "ghost"} className="h-8 rounded-full" aria-pressed={value === v} onClick={() => onChange(v)}>{v === "ORM" ? "ORM" : "Marcom"}</Button>)}</div>;
}

function DeptBadge({ stage, line, variant }: { stage: string; line?: ServiceLine; variant?: ServiceVariant }) {
  return <Chip tone="muted">{deptBadge(stage, variant ?? (line === "MARCOM" ? "MARCOM_META_TIKTOK" : "ORM"))}</Chip>;
}

function ChecklistSection({ card, readOnly }: { card: OnboardingCard; readOnly: boolean }) {
  const s = useServicing();
  const sequence = fullSequence(card.service_variant);
  const currentIndex = sequence.indexOf(card.current_stage === "property_pending" ? "collect_data" : card.current_stage);
  const stages = [...new Set([...sequence.slice(0, currentIndex + 1), card.current_stage])];
  const [stageKey, setStageKey] = useState("");
  const [group, setGroup] = useState("");
  const [label, setLabel] = useState("");
  const owner = (stage: string) => (stage === "collect_data" ? "ae" : "service");
  const blocks = stages.map((stage) => ({ stage, items: s.checklistItems.filter((i) => i.card_id === card.id && i.stage_key === stage) })).filter((b) => b.items.length);
  const templates = s.checklistTemplates.filter((t) => t.service_variant === card.service_variant && !t.has_two_tick);
  return <section className="space-y-3 border-b pb-4" aria-label="Checklist">
    <p className="text-sm font-semibold">Checklist <span className="text-xs font-normal text-muted-foreground">· ไม่ล็อกการเลื่อนขั้น</span></p>
    {blocks.map(({ stage, items }) => {
      const can = !readOnly && (s.test_mode || s.role === owner(stage));
      const groups = [...new Set(items.map((i) => i.group_label))];
      return <details key={`${card.id}-${card.current_stage}-${stage}`} open={stage === card.current_stage || undefined} className="space-y-2 rounded-md border p-3">
        <summary className="cursor-pointer text-xs font-medium"><span className="inline-flex flex-wrap items-center gap-2">{STAGE_LABEL[stage]}<DeptBadge stage={stage} variant={card.service_variant} />{stage === "collect_data" && card.service_variant === "ORM" && <span className="text-muted-foreground">· แบบฟอร์ม WS-2: {card.form_completion_status}</span>}<span className="text-muted-foreground">· {items.filter((i) => i.checked).length}/{items.length}</span></span></summary>
        {groups.map((g) => <div key={g} className="space-y-1">{g && <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{g}</p>}{items.filter((i) => i.group_label === g).map((i) => <label key={i.id} className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={i.checked} disabled={!can} onCheckedChange={() => s.toggleChecklistItem(i.id)} /><span>{i.label}{i.checked_at && <span className="block text-[11px] text-muted-foreground">✓ {fmtDayMon(i.checked_at)} {new Date(i.checked_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>}</span></label>)}</div>)}
      </details>;
    })}
    {!blocks.length && <p className="text-xs text-muted-foreground">ขั้นนี้ไม่มี checklist (milestone)</p>}
    {s.role === "pm" && <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer font-medium">แก้แม่แบบ Checklist (PM) · มีผลกับการ์ดใหม่เท่านั้น</summary>
      <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">{templates.map((t) => <div key={t.id} className="flex items-center gap-2"><span className="w-28 shrink-0 truncate text-[11px] text-muted-foreground">{STAGE_LABEL[t.stage_key]}</span><Input defaultValue={t.item_label} className="h-7 text-xs" onBlur={(e) => e.target.value.trim() && e.target.value !== t.item_label && s.renameTemplateItem(t.id, e.target.value.trim())} /><Button size="sm" variant="ghost" onClick={() => s.removeTemplateItem(t.id)}>ลบ</Button></div>)}</div>
      <div className="mt-2 flex flex-wrap gap-2"><Input value={stageKey} onChange={(e) => setStageKey(e.target.value)} placeholder="stage_key" className="h-8 w-36 text-xs" /><Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="กลุ่ม" className="h-8 w-28 text-xs" /><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="รายการใหม่" className="h-8 flex-1 text-xs" /><Button size="sm" disabled={!stageKey.trim() || !label.trim()} onClick={() => { s.addTemplateItem(stageKey.trim(), card.service_variant, group.trim(), label.trim()); setLabel(""); }}>เพิ่ม</Button></div>
    </details>}
  </section>;
}

function OrmHandover({ card }: { card: OnboardingCard }) {
  const s = useServicing();
  const otas = handoverOtas(card);
  const progress = handoverProgress(s, card);
  const [selectedOta, setOta] = useState<string>(otas[0] ?? OTA_CHANNELS[0]);
  const ota = otas.includes(selectedOta) ? selectedOta : otas[0] ?? selectedOta;
  const [room, setRoom] = useState("");
  const [tGroup, setTGroup] = useState("");
  const [tLabel, setTLabel] = useState("");
  const items = progress.items;
  const creds = s.credentials.filter((c) => c.card_id === card.id && otas.includes(c.ota_channel));
  const rooms = s.roomMappings.filter((m) => m.card_id === card.id && otas.includes(m.ota_channel));
  const roomNames = [...new Set(rooms.map((m) => m.original_room_name))];
  const specOpen = specialistHandoverOpen(card);
  const isSpec = s.role === "specialist" && specOpen;
  const accepting = card.current_stage === "completed";
  const otaItems = items.filter((h) => (h.ota_channel ?? "อื่นๆ") === ota);
  const groups = [...new Set(otaItems.map((h) => h.group_label ?? ""))];
  const doneOf = (o: string) => { const l = items.filter((h) => (h.ota_channel ?? "อื่นๆ") === o); return `${l.filter((h) => accepting ? h.verifier_checked : h.specialist_checked).length}/${l.length}`; };
  const allTicked = accepting ? progress.verifierDone : progress.specialistDone;
  const credsDone = progress.credentialsDone;
  const roomsDone = progress.roomsDone;
  const tmpl = s.checklistTemplates.filter((t) => t.has_two_tick && t.ota_channel === ota);
  return <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold">{accepting ? "ORM Handover · ORM ตรวจรับ (row-2) ก่อน System Training" : "ORM Handover · Specialist ทำครบ 4 ส่วน (คู่ขนาน · เพดาน Final Setup)"}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
        <Chip tone={allTicked ? "info" : "muted"}>{allTicked ? "✓" : "○"} OTA checklist</Chip>
        <Chip tone={credsDone ? "info" : "muted"}>{credsDone ? "✓" : "○"} OTA Log-in</Chip>
        <Chip tone={roomsDone ? "info" : "muted"}>{roomsDone ? "✓" : "○"} Room schema</Chip>
        <Chip tone={(accepting ? progress.pmsVerified : progress.pmsDone) ? "info" : "muted"}>{(accepting ? progress.pmsVerified : progress.pmsDone) ? "✓" : "○"} PMS / CM</Chip>
      </div>
    </div>
    <div className="space-y-1 rounded-md border p-2" aria-label="PMS / CM">
      <p className="text-xs font-semibold">4. เปิดระบบ PMS / CM</p>
      <label className="flex items-center gap-2 text-xs"><Checkbox aria-label="Specialist: เปิดระบบ PMS / CM" checked={!!card.pms_specialist_at} disabled={!specOpen || (!s.test_mode && s.role !== "specialist")} onCheckedChange={() => s.togglePms(card.id)} />Specialist ยืนยันเปิดระบบแล้ว{card.pms_specialist_at && <span className="text-muted-foreground">· {new Date(card.pms_specialist_at).toLocaleString("th-TH")}</span>}</label>
      <label className="flex items-center gap-2 text-xs"><Checkbox aria-label="ORM: ตรวจรับ PMS / CM" checked={!!card.pms_verified_at} disabled={!accepting || !card.pms_specialist_at || (!s.test_mode && s.role !== "service")} onCheckedChange={() => s.togglePms(card.id)} />ORM ตรวจรับ{card.pms_verified_at && <span className="text-muted-foreground">· {new Date(card.pms_verified_at).toLocaleString("th-TH")}</span>}</label>
    </div>
    {card.orm_lite && <div className="space-y-2" aria-label="ORM-Lite OTA selection">
      <p className="text-xs font-semibold">ORM-Lite · OTA {otas.length}/3</p>
      <div className="flex flex-wrap gap-2">{OTA_CHANNELS.map((o) => <label key={o} className="flex items-center gap-2 text-xs"><Checkbox aria-label={`เลือก OTA ${o}`} checked={otas.includes(o)} disabled={!isSpec || (!otas.includes(o) && otas.length >= 3)} onCheckedChange={() => s.setHandoverOtas(card.id, otas.includes(o) ? otas.filter((item) => item !== o) : [...otas, o])} />{o}</label>)}</div>
    </div>}
    <div className="space-y-2" aria-label="OTA checklist">
      <p className="text-xs font-medium">1 · OTA checklist · {accepting ? "ORM ตรวจรับที่ Completed (Handover)" : "Specialist ติ๊กได้ตั้งแต่ Approved ถึง Final Setup"}</p>
      <div className="flex flex-wrap gap-1">{otas.map((o) => <Button key={o} type="button" size="sm" variant={o === ota ? "default" : "outline"} className="h-7 text-xs" onClick={() => setOta(o)}>{o} · {doneOf(o)}</Button>)}</div>
      <table className="w-full text-sm">
        <thead className="text-[11px] text-muted-foreground"><tr><th className="text-left">รายการ</th><th className="w-20">Specialist</th><th className="w-20">ORM</th></tr></thead>
        <tbody>{groups.map((g) => [
          <tr key={`g-${g}`}><td colSpan={3} className="pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{g}</td></tr>,
          ...otaItems.filter((h) => (h.group_label ?? "") === g).map((h) => <tr key={h.id} className="border-t">
            <td className="whitespace-normal break-words py-2 pr-3 text-xs">{h.item_label}</td>
            <td className="text-center"><Checkbox aria-label={`Specialist: ${ota} ${h.item_label}`} checked={h.specialist_checked} disabled={!specOpen || (!s.test_mode && !isSpec)} onCheckedChange={() => s.toggleHandover(h.id, "specialist")} /></td>
            <td className="text-center"><Checkbox aria-label={`ORM: ${ota} ${h.item_label}`} checked={h.verifier_checked} disabled={!accepting || (!s.test_mode && s.role !== "service") || !h.specialist_checked} onCheckedChange={() => s.toggleHandover(h.id, "verifier")} /></td>
          </tr>),
        ])}</tbody>
      </table>
      {s.role === "pm" && <details className="rounded-md border p-2 text-xs"><summary className="cursor-pointer font-medium">แก้แม่แบบ Handover {ota} (PM) · มีผลกับการ์ดใหม่เท่านั้น</summary>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{tmpl.map((t) => <div key={t.id} className="flex items-center gap-2"><span className="w-24 shrink-0 truncate text-muted-foreground">{t.group_label}</span><Input defaultValue={t.item_label} className="h-7 text-xs" onBlur={(e) => e.target.value.trim() && e.target.value !== t.item_label && s.renameTemplateItem(t.id, e.target.value.trim())} /><Button size="sm" variant="ghost" onClick={() => s.removeTemplateItem(t.id)}>ลบ</Button></div>)}</div>
        <div className="mt-2 flex gap-2"><Input value={tGroup} onChange={(e) => setTGroup(e.target.value)} placeholder="กลุ่ม" className="h-7 w-28 text-xs" /><Input value={tLabel} onChange={(e) => setTLabel(e.target.value)} placeholder="รายการใหม่" className="h-7 flex-1 text-xs" /><Button size="sm" disabled={!tGroup.trim() || !tLabel.trim()} onClick={() => { s.addHandoverTemplate(ota, tGroup.trim(), tLabel.trim()); setTLabel(""); }}>เพิ่ม</Button></div>
      </details>}
    </div>
    <div className="space-y-2" aria-label="OTA Log-in">
      <p className="text-xs font-medium">2 · Provide OTA Log-in (Specialist กรอก)</p>
      <p className="text-[11px] text-muted-foreground">{card.property_name} · Hotel ID {card.property_id}</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-xs">
        <thead><tr className="text-left text-[11px] text-muted-foreground"><th className="py-2 pr-2">OTA</th><th className="pr-2">Hotel ID</th><th className="pr-2">Username</th><th className="pr-2">Password</th><th>Commission %</th></tr></thead>
        <tbody>{creds.map((c) => <tr key={c.id} className="border-t">
          <td className="py-2 pr-2">{c.ota_channel}</td>
          <td className="pr-2"><Input aria-label={`${c.ota_channel} Hotel ID`} disabled={!isSpec} className="h-8 min-w-20 text-xs" value={c.hotel_id} onChange={(e) => s.setCredential(c.id, { hotel_id: e.target.value })} /></td>
          <td className="pr-2"><Input aria-label={`${c.ota_channel} username`} disabled={!isSpec} className="h-8 min-w-24 text-xs" placeholder="username" value={c.username} onChange={(e) => s.setCredential(c.id, { username: e.target.value })} /></td>
          <td className="pr-2"><Input aria-label={`${c.ota_channel} password`} disabled={!isSpec} type="password" className="h-8 min-w-24 text-xs" placeholder="password" value={c.password} onChange={(e) => s.setCredential(c.id, { password: e.target.value })} /></td>
          <td><Input aria-label={`${c.ota_channel} commission`} disabled={!isSpec} className="h-8 min-w-16 text-xs" placeholder="%" value={c.commission} onChange={(e) => s.setCredential(c.id, { commission: e.target.value })} /></td>
        </tr>)}</tbody>
      </table></div>
      <p className="text-[11px] text-muted-foreground">ต้นแบบเท่านั้น · ข้อมูลเก็บในเบราว์เซอร์นี้ ห้ามใส่รหัสผ่านจริง</p>
    </div>
    <div className="space-y-2" aria-label="Room schema">
      <p className="text-xs font-medium">3 · Room schema · จับคู่ชื่อห้องกับ {otas.length} OTA</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-xs">
        <thead className="text-[11px] text-muted-foreground"><tr><th className="text-left">ห้องเดิม</th>{otas.map((o) => <th key={o} className="text-left">{o}</th>)}<th /></tr></thead>
        <tbody>{roomNames.map((n) => <tr key={n} className="border-t">
          <td className="py-1 pr-1 font-medium">{n}</td>
          {otas.map((o) => { const m = rooms.find((r) => r.original_room_name === n && r.ota_channel === o); return <td key={o} className="pr-1">{m && <Input aria-label={`${n} บน ${o}`} disabled={!isSpec} className="h-7 text-xs" value={m.ota_room_name} onChange={(e) => s.setRoomMapping(m.id, e.target.value)} />}</td>; })}
          <td><Button aria-label={`ลบห้อง ${n}`} size="icon" variant="ghost" className="size-7" disabled={!isSpec} onClick={() => s.removeRoom(card.id, n)}><Trash2 className="size-3.5" /></Button></td>
        </tr>)}</tbody>
      </table></div>
      {!roomNames.length && <p className="text-[11px] text-muted-foreground">ยังไม่มีประเภทห้อง</p>}
      <div className="flex gap-2"><Input aria-label="ชื่อห้องเดิม" className="h-8 text-xs" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="ชื่อห้องเดิม เช่น Deluxe Double" /><Button size="sm" variant="outline" disabled={!isSpec || !otas.length || !room.trim()} onClick={() => { s.addRoom(card.id, room); setRoom(""); }}>เพิ่มห้อง</Button></div>
    </div>
  </div>;
}

function ExternalAppButton({ card }: { card: OnboardingCard }) {
  const navigate = useNavigate();
  if (trackForStage(card, card.current_stage) !== "SERVICE") return null;
  const app = card.external_app ?? externalAppFor(card.service_line);
  const name = app === "ORM_APP" ? "ORM" : "Marcom";
  let destination: string | null = null;
  try {
    const url = new URL(card.external_ref_url ?? "");
    if (url.protocol === "https:" || url.protocol === "http:") destination = url.href;
  } catch { /* No destination record yet. */ }
  if (destination) return <Button asChild size="sm" variant="outline"><a href={destination} target="_blank" rel="noopener noreferrer">Open in {name} App <ExternalLink className="size-3.5" /></a></Button>;
  return <Button size="sm" variant="outline" onClick={() => {
    toast.info(`${name} App servicing — coming soon`);
    void navigate({ to: app === "ORM_APP" ? "/orm" : "/marcom" });
  }}>Open in {name} App <ExternalLink className="size-3.5" /></Button>;
}

function TrackingView({ cards, onCompare, onOpen }: { cards: OnboardingCard[]; onCompare: (id: string) => void; onOpen: (id: string) => void }) {
  const groups = [...new Set(cards.map((card) => card.property_id))].map((id) => ({ id, cards: cards.filter((card) => card.property_id === id) }));
  return <div className="divide-y rounded-lg border">{groups.map(({ id, cards: group }) => <div key={id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{group[0]?.property_name}</p><div className="flex items-center gap-2"><DisparityBadge cards={group} />{group.length > 1 && <Button size="sm" variant="ghost" onClick={() => onCompare(id)}>Compare</Button>}</div></div><div className="mt-2 divide-y">{group.map((card) => <div key={card.id} className="flex flex-wrap items-center gap-3 py-2 text-sm"><Chip tone={card.service_line === "ORM" ? "info" : "muted"}>{card.service_line}</Chip><span className="flex-1">{STAGE_LABEL[card.current_stage]}</span><span className="font-mono text-xs text-muted-foreground">Day {currentDay(card)}</span><WorkLink card={card} onOpen={onOpen} /></div>)}</div></div>)}{!groups.length && <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบการ์ด</p>}</div>;
}

function trackForStage(_card: OnboardingCard, stage: string): OwnerTrack {
  if (AE_TRACK_STAGES.has(stage)) return "AE";
  if (stage === "approved" || stage === "completed") return "SPECIALIST";
  return "SERVICE";
}

/** Pipeline only reveals cards; stage advancement belongs exclusively to ServicingCardDrawer. */
function FullPipeline({ onOpen, focusStage, landingKey }: { onOpen: (id: string) => void; focusStage: string | null; landingKey: string }) {
  const s = useServicing();
  const [q, setQ] = useState("");
  const [line, setLine] = useState<ServiceLine>("ORM");
  const [mineOnly, setMineOnly] = useState(false);
  useEffect(() => {
    if (!landingKey) return;
    const target = s.cards.find((c) => landingKey.includes(c.id));
    setQ(""); setLine(target?.service_line ?? "ORM"); setMineOnly(false);
  }, [landingKey]);
  useEffect(() => {
    if (!focusStage) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`servicing-stage-${focusStage}`)?.scrollIntoView({ block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusStage, landingKey]);
  const sequence = lineSequence(line);
  const cards = s.cards.filter((card) => (!q || `${card.property_name} ${card.contract_ref}`.toLowerCase().includes(q.toLowerCase())) && card.service_line === line && (!mineOnly || card.assigned_ae_id === CURRENT_AE));
  return <div className="space-y-3"><div className="flex flex-wrap gap-2"><div className="relative min-w-[14rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาการ์ดบริการ" className="pl-9" /></div><LineToggle value={line} onChange={setLine} /><Button size="sm" variant={mineOnly ? "default" : "outline"} className="h-9 rounded-full" aria-pressed={mineOnly} onClick={() => setMineOnly((value) => !value)}>ของฉัน</Button></div><div className="overflow-x-auto pb-2"><div className="flex min-w-max gap-3">{sequence.map((stage) => { const stageCards = cards.filter((card) => card.current_stage === stage); return <div key={stage} id={`servicing-stage-${stage}`} data-focused={focusStage === stage} className="w-[280px] shrink-0 rounded-lg border bg-card p-3"><div className="flex items-center justify-between gap-2"><p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{STAGE_LABEL[stage]}<DeptBadge stage={stage} line={line} /></p><Chip tone="muted">{stageCards.length}</Chip></div><p className="mt-1 text-xs text-muted-foreground">Owner: {stageCards[0] ? TRACK_LABEL[trackForStage(stageCards[0], stage)] : "—"}</p><div className="mt-3 space-y-2">{stageCards.map((card) => <Button key={card.id} variant="ghost" onClick={() => onOpen(card.id)} className="h-auto min-h-16 w-full justify-start rounded-md border px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate text-sm font-medium">{card.property_name}</span><span className="mt-1 block text-xs text-muted-foreground">{card.service_line} · Day {currentDay(card)}</span></span></Button>)}{!stageCards.length && <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">ว่าง</p>}</div></div>; })}</div></div><div className="rounded-lg border"><div className="border-b px-4 py-3"><p className="text-sm font-semibold">History</p><p className="text-xs text-muted-foreground">เหตุการณ์ล่าสุดจากการทำงานในระบบ</p></div><div className="divide-y">{[...s.events].sort((a, b) => b.entered_at.localeCompare(a.entered_at)).slice(0, 12).map((event) => { const card = s.cards.find((item) => item.id === event.card_id); return <div key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"><span className="min-w-[10rem] font-medium">{card?.property_name}</span><Chip tone="muted">{card?.service_line}</Chip><span className="flex-1">{STAGE_LABEL[event.stage_key]}</span><span className="font-mono text-xs text-muted-foreground">{fmtDayMon(event.entered_at)} · Day {card ? daysBetween(card.created_at, event.entered_at) : "—"}</span></div>; })}</div></div></div>;
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
  const [showPast, setShowPast] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const evs = eventsOf(s, card.id);
  const sequence = fullSequence(card.service_variant);
  if (card.current_stage === "property_pending" || evs.some((e) => e.stage_key === "property_pending")) sequence.splice(3, 0, "property_pending");
  const currentIndex = sequence.indexOf(card.current_stage);
  const visible = showFull ? sequence : sequence.slice(0, currentIndex + 2);
  const hs = s.handoverSurveys.find((h) => h.card_id === card.id);
  return <section className="space-y-3 border-b pb-4" aria-label="Stage timeline">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" size="sm" aria-expanded={showPast} onClick={() => setShowPast((value) => !value)}>ผ่านมาแล้ว · {Math.max(0, currentIndex)}</Button>
      <Button variant="ghost" size="sm" aria-expanded={showFull} onClick={() => setShowFull((value) => !value)}>{showFull ? "ย่อฉบับเต็ม" : "ดูฉบับเต็ม"}</Button>
    </div>
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-start" aria-label="ลำดับขั้นตอน">
        {visible.map((stage, index) => {
          const past = index < currentIndex;
          const active = stage === card.current_stage;
          const labeled = !past || showPast || showFull;
          const event = evs.find((e) => e.stage_key === stage);
          const detail = event ? `${fmtDayMon(event.entered_at)} · Day ${daysBetween(card.created_at, event.entered_at)}` : "";
          return <li key={stage} data-stage={stage} aria-current={active ? "step" : undefined} className={cn("relative shrink-0 pt-1", labeled ? "w-36" : "w-7")}>
            {index < visible.length - 1 && <span aria-hidden="true" className="absolute left-3 right-0 top-3 border-t border-border" />}
            <span title={`${STAGE_LABEL[stage]}${detail ? ` · ${detail}` : ""}`} className={cn("relative z-10 ml-1 block rounded-full border", active ? "size-4 border-primary bg-primary ring-4 ring-primary/15" : past ? "mt-1 size-2 border-muted-foreground bg-muted-foreground" : "size-4 border-muted-foreground bg-background")} />
            {labeled && <div className="mt-3 space-y-1 pr-3 text-xs">
              <p className={cn("break-words", active ? "font-semibold text-primary" : past ? "text-muted-foreground" : "text-foreground")}>{STAGE_LABEL[stage]}{stage === card.billing_anchor_stage ? " ★" : ""}</p>
              {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
              {stage === "completed" && hs && <SurveyBadge status={surveyStatus(hs)} expires={hs.window_expires_at} />}
            </div>}
          </li>;
        })}
      </ol>
    </div>
  </section>;
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

const ACTOR_LABEL: Record<string, string> = { ae: "AE", specialist: "Specialist", service: "Service" };

/** The single role-aware guided drawer shared by every Servicing entry point. */
export function ServicingCardDrawer({ id, onClose, readOnly = false }: { id: string | null; onClose: () => void; readOnly?: boolean }) {
  const s = useServicing();
  const card = s.cards.find((c) => c.id === id);
  if (!card) return null;

  const nxt = nextStage(card.service_variant, card.current_stage);
  const gate = s.canAdvance(card.id);
  const missing = nxt ? gate.reasons ?? [] : [];
  const finals = s.finalChecks.filter((f) => f.card_id === card.id);
  const hs = s.handoverSurveys.find((h) => h.card_id === card.id);
  const cs = s.customerSurveys.find((c) => c.card_id === card.id);
  const finalsDone = finals.length > 0 && finals.every((f) => f.checked);
  const actor: "ae" | "specialist" | "service" = nxt === "approved" ? (finalsDone ? "specialist" : "ae") : nxt === "completed" ? "service" : nxt === "orm_prepare_data" || nxt === "marcom_prepare_data" ? "specialist" : AE_TRACK_STAGES.has(card.current_stage) ? "ae" : "service";
  const actorRoles: Role[] = nxt === "approved" && finalsDone ? ["specialist", "pm"] : nxt === "completed" || nxt === "orm_prepare_data" || nxt === "marcom_prepare_data" ? ["specialist", "service"] : [actor];
  const canAct = !readOnly && actorRoles.includes(s.role);
  const waitMsg = card.current_stage === "final_check"
    ? (finalsDone ? "พร้อม Approve · อยู่ที่ Specialist (หรือ PM)" : "รอ AE ติ๊ก Final Check ให้ครบ")
    : `ขั้นถัดไปโดย ${ACTOR_LABEL[actor]}`;
  const doAdvance = (to?: string) => {
    const r = s.advance(card.id, { ...(to ? { to } : {}) });
    if (r.ok) toast.success(`เข้าสู่ ${STAGE_LABEL[to ?? nxt ?? ""]}`);
    else toast.info(r.error ?? "ยังเลื่อนไม่ได้");
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={cn("w-full overflow-y-auto", card.service_variant === "ORM" ? "sm:w-[max(36rem,33vw)] sm:max-w-[min(56rem,100vw)]" : "sm:max-w-xl")}>
        <SheetHeader>
          <SheetTitle>
            {card.property_name} · {card.service_line} {card.contract_ref}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5 px-1 pb-8">
          <SumChips card={card} />
          <section className="space-y-3 border-b pb-4" aria-label="Current step">
            <p className="text-xs text-muted-foreground">ขั้นตอนปัจจุบัน · Day {currentDay(card)}</p>
            <h3 className="flex flex-wrap items-center gap-2 font-display text-xl font-semibold">{STAGE_LABEL[card.current_stage]}<DeptBadge stage={card.current_stage} variant={card.service_variant} /></h3>
            <p className="text-sm">{card.service_variant === "ORM" && card.current_stage === "approved" ? "Specialist: ทำข้อมูลส่งมอบครบทั้ง 4 ส่วน (รวมเปิดระบบ PMS / CM) แล้วกด Completed" : card.service_variant === "ORM" && card.current_stage === "completed" ? "ORM: ติ๊กตรวจรับทุกรายการก่อนเริ่ม Prepare Data" : STAGE_GUIDANCE[card.current_stage]}</p>
            <p className="text-xs text-muted-foreground">ผู้รับผิดชอบ: {card.current_stage === "approved" || card.current_stage === "final_check" ? "AE / Specialist / Service" : ["new_property", "introduction_sent_form", "collect_data", "property_pending"].includes(card.current_stage) ? card.assigned_ae_id : card.assigned_service_owner_id}</p>
            {nxt && <p className="rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="font-medium">{readOnly ? "อ่านอย่างเดียว · " : !canAct ? "ไม่ใช่ขั้นของคุณ · " : ""}</span>{waitMsg}</p>}
            {nxt && <Button className="w-full sm:w-auto" disabled={!canAct || missing.length > 0} onClick={() => doAdvance()}>{nxt === "approved" ? "Approve" : nxt === "completed" ? "Completed" : nxt.endsWith("go_live") ? "ยืนยัน Go Live" : `ทำขั้นนี้เสร็จ → ${STAGE_LABEL[nxt]}`}</Button>}
            <ExternalAppButton card={card} />
            {missing.length > 0 && <div className="border-l-2 pl-3 text-sm text-muted-foreground"><p className="font-medium text-foreground">สิ่งที่ต้องทำก่อนดำเนินการต่อ</p><ul className="mt-1 space-y-1">{missing.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
            {card.current_stage === "collect_data" && <Button variant="outline" disabled={!canAct} onClick={() => doAdvance("property_pending")}>Mark Property Pending</Button>}
          </section>
          <Timeline key={card.id} card={card} />
          <ChecklistSection card={card} readOnly={readOnly} />
          <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-5 border-0 p-0">

          <Ws2Panel card={card} readOnly={readOnly} />

          </fieldset>

          <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-5 border-0 p-0">
          {card.current_stage === "final_check" && (
            <section className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Final Check (AE)</h3>
              <ul className="mt-2 space-y-1.5">
                {finals.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox aria-label={f.item_label} checked={f.checked} disabled={readOnly || (!s.test_mode && s.role !== "ae")} onCheckedChange={() => s.toggleFinalCheck(f.id)} />
                      {f.item_label}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-muted-foreground">AE ติ๊ก · Specialist (หรือ PM) เป็นผู้กด Approve</p>
            </section>
          )}

          <MeetingBilling card={card} readOnly={readOnly} />
           {card.service_variant === "ORM" && (specialistHandoverOpen(card) || card.current_stage === "completed") && <section className="space-y-3 border-b pb-4"><OrmHandover card={card} /></section>}


           {hs && (card.service_variant !== "ORM" || handoverProgress(s, card).verifierDone) && <HandoverSurveyForm key={hs.id} id={hs.id} status={surveyStatus(hs)} score={hs.score} />}
          {cs && <CustomerSurveyForm key={cs.id} id={cs.id} responded={!!cs.responded_at} />}
          </fieldset>
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
          <Button variant="outline" size="sm" disabled={s.role !== "service"} onClick={() => { s.submitHandoverSurvey(id, v, c); toast.success("ส่ง Survey #1 แล้ว"); }}>
            ส่งคะแนน (Service)
          </Button>
        </div>
      )}
    </section>
  );
}

function CustomerSurveyForm({ id, responded }: { id: string; responded: boolean }) {
  const s = useServicing();
  const [f, setF] = useState({ score_bd: 4, score_ae: 4, score_service_exp: 4, score_strategy: 4, score_overall: 4, comment: "" });
  return (
    <section className="rounded-lg border p-3 text-sm">
      <h3 className="font-semibold">◇ Survey #2 · แบบประเมินความพึงพอใจลูกค้า</h3>
      {responded ? (
        <p className="mt-1 text-muted-foreground">ลูกค้าตอบแล้ว</p>
      ) : (
        <div className="mt-2 space-y-2">
          {([
            ["score_bd", "ฝ่ายขาย (BD)"],
            ["score_ae", "ฝ่ายดูแลลูกค้า (AE)"],
            ["score_service_exp", "ฝ่ายกลยุทธ์ (ORM)"],
            ["score_strategy", "ความเหมาะสมของแผนกลยุทธ์ (Strategy)"],
            ["score_overall", "ความพึงพอใจโดยภาพรวม"],
          ] as const).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-xs">{l}</span>
              <ScorePicker value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} max={5} />
            </div>
          ))}
          <Textarea value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)" />
          <Button size="sm" variant="outline" onClick={() => { s.submitCustomerSurvey(id, f); toast.success("บันทึก Survey #2 แล้ว"); }}>
            บันทึกคำตอบลูกค้า
          </Button>
        </div>
      )}
    </section>
  );
}

const fmtDate = (d: string) => { const [y, m, day] = d.slice(0, 10).split("-"); return `${day}/${m}/${y}`; };

/** v6.2: meeting date (Prepare Data) → record URL + billing-confirmation email (meeting stage; GMB at Go Live). */
function MeetingBilling({ card, readOnly }: { card: OnboardingCard; readOnly: boolean }) {
  const s = useServicing();
  const gmb = card.service_variant === "MARCOM_GMB";
  const canEdit = !readOnly && (s.test_mode || s.role === "service");
  const atPrep = !gmb && ["orm_prepare_data", "marcom_prepare_data"].includes(card.current_stage);
  const atAnchor = card.current_stage === card.billing_anchor_stage;
  if (!atPrep && !atAnchor && !card.billing_email_sent_at && !card.meeting_date) return null;
  const meetingName = card.service_variant === "ORM" ? "Rate Structure" : "First Sync-up";
  const startText = gmb ? fmtDate((card.billing_start_at ?? new Date().toISOString())) : card.meeting_date ? fmtDate(card.meeting_date) : "dd/mm/yyyy";
  const send = () => { const r = s.sendBillingEmail(card.id); if (r.ok) toast.success("ส่งอีเมลยืนยันถึงลูกค้าแล้ว · เริ่มคิดค่าบริการ + Survey #2"); else toast.info(r.error); };
  return (
    <section className="space-y-2 border-b pb-4" aria-label="Meeting and billing">
      {!gmb && <div className="space-y-1">
        <label htmlFor={`meeting-date-${card.id}`} className="text-xs font-medium">ระบุวันนัดประชุม · {meetingName}</label>
        <Input id={`meeting-date-${card.id}`} type="date" aria-label="Meeting date" className="h-9 w-48 text-sm" value={card.meeting_date ?? ""} disabled={!atPrep || !canEdit} onChange={(e) => s.setMeetingDate(card.id, e.target.value || null)} />
        {atPrep && <p className="text-[11px] text-muted-foreground">ต้องระบุก่อนเข้า {meetingName} · วันนี้จะเป็นวันเริ่มคิดค่าบริการ</p>}
      </div>}
      {atAnchor && !gmb && <div className="space-y-1">
        <label htmlFor={`record-${card.id}`} className="text-xs font-medium">แนบ Record ประชุม (URL)</label>
        <Input id={`record-${card.id}`} aria-label="Meeting record URL" className="h-9 text-sm" placeholder="https://…" value={card.meeting_record_url ?? ""} disabled={!canEdit || !!card.billing_email_sent_at} onChange={(e) => s.setMeetingRecord(card.id, e.target.value)} />
      </div>}
      {(atAnchor || card.billing_email_sent_at) && <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs">
        <p className="font-medium">อีเมลถึงลูกค้า</p>
        <ul className="list-disc space-y-0.5 pl-4">
          {gmb ? <li>ยืนยันว่าเปิดให้บริการ Google My Business เรียบร้อยแล้ว</li> : <li>ยืนยันว่าการประชุม {meetingName} กับทีม H+ เรียบร้อยแล้ว</li>}
          <li>วันที่ {startText} = วันเริ่มคิดค่าบริการ และเป็นวันที่ 1 ของอายุสัญญา</li>
          {!gmb && <li>Record การประชุม: {card.meeting_record_url || "—"}</li>}
          <li>ลิงก์แบบประเมินความพึงพอใจ (Survey #2)</li>
        </ul>
        {card.billing_email_sent_at
          ? <p className="text-muted-foreground">ส่งแล้ว {new Date(card.billing_email_sent_at).toLocaleString("th-TH")} · ★ เริ่มคิดค่าบริการ {card.billing_start_at ? fmtDate(card.billing_start_at) : ""}</p>
          : <Button size="sm" disabled={!canEdit || (!gmb && !/^https?:\/\/\S+/.test(card.meeting_record_url ?? ""))} onClick={send}>Send email to customer</Button>}
      </div>}
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

function KpiView({ cards }: { cards?: OnboardingCard[] }) {
  const s = useServicing();
  const [kpiOpen, setKpiOpen] = useState<string | null>(null);
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
                <th className="py-1">Hotel</th><th>Service</th><th>Σ AE</th><th>Σ Specialist</th><th>Σ Service</th><th>Overall</th><th>Bottleneck</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.card.id} className={cn("border-t", r.outlier && "bg-muted/60 font-semibold")}>
                  <td className="py-1.5">{r.card.property_name}</td>
                  <td>{r.card.service_line}</td>
                  <td className="tabular-nums">{d(r.ae)}</td>
                  <td className="tabular-nums">{d(r.specialist)}</td>
                  <td className="tabular-nums">{d(r.service)}</td>
                  <td className="tabular-nums">{d(r.overall)}</td>
                  <td>{r.bottleneck ? TRACK_LABEL[r.bottleneck] : "—"}</td>
                  <td>{r.outlier ? "✕ Outlier" : "In range"}</td>
                  <td><WorkLink card={r.card} onOpen={setKpiOpen} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ServicingCardDrawer key={kpiOpen ?? "closed"} id={kpiOpen} readOnly onClose={() => setKpiOpen(null)} />
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
