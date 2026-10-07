/* PS App v5.0 · Phase 1 — Servicing re-design: cumulative day-count timeline.
 * Prototype store (localStorage). Tables mirror spec §2; ORM/Marcom sync is mocked
 * via editable timestamps. No deadline semantics anywhere. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ServiceLine = "ORM" | "MARCOM";
export type OwnerTrack = "AE" | "SPECIALIST" | "SERVICE";
export type Role = "ae" | "specialist" | "pm" | "service" | "management";
export type FormStatus = "not_started" | "in_progress" | "complete";

export type OnboardingCard = {
  id: string;
  property_id: string;
  property_name: string;
  service_line: ServiceLine;
  contract_ref: string;
  created_at: string;
  current_stage: string;
  assigned_ae_id: string;
  assigned_specialist_id: string;
  assigned_service_owner_id: string;
  billing_start_at: string | null;
  billing_anchor_stage: string;
  go_live_at: string | null;
  meeting_record_url: string | null;
  pre_service_form_ref: string | null;
  form_completion_status: FormStatus;
};
export type StageEvent = { id: string; card_id: string; stage_key: string; entered_at: string; owner_track: OwnerTrack };
export type FinalCheckItem = { id: string; card_id: string; item_label: string; checked: boolean; checked_at: string | null };
export type HandoverItem = {
  id: string;
  card_id: string;
  item_label: string;
  specialist_checked: boolean;
  specialist_checked_at: string | null;
  verifier_checked: boolean;
  verifier_checked_at: string | null;
};
export type HandoverSurvey = {
  id: string;
  card_id: string;
  evaluatee_specialist_id: string;
  evaluator_service_id: string;
  score: number | null;
  comment: string | null;
  submitted_at: string | null;
  window_expires_at: string;
  status: "pending" | "submitted" | "expired";
};
export type CustomerSurvey = {
  id: string;
  card_id: string;
  dispatched_at: string;
  responded_at: string | null;
  score_bd: number | null;
  score_ae: number | null;
  score_service_exp: number | null;
  score_strategy: number | null;
  nps: number | null;
  comment: string | null;
  optional: boolean;
};

/* ---------------- stage constants (§3) ---------------- */

export const STAGE_LABEL: Record<string, string> = {
  new_property: "New Property",
  introduction_sent_form: "Introduction & Sent Form",
  collect_data: "Collect Data",
  property_pending: "Property Pending",
  final_check: "Final Check",
  approved: "Approved",
  completed: "Completed (Handover)",
  rate_structure_meeting: "Rate Structure Meeting",
  send_summary: "Send Summary",
  load_bar_rate: "Load BAR Rate",
  mapping: "Mapping",
  request_forward_booking: "Request Forward Booking",
  register_training: "Register & Training",
  brand_dna_wall: "Brand DNA Wall",
  audience_key_message: "Audience & Key Message",
  content_plan_52w: "Content Plan 52W",
  ads_planning: "Ads Planning",
  first_sync_up_meeting: "First Sync-up Meeting",
  go_live: "Go Live",
};
export const AE_TRACK = ["new_property", "introduction_sent_form", "collect_data", "final_check", "approved"];
export const SERVICE_TRACK: Record<ServiceLine, string[]> = {
  ORM: ["rate_structure_meeting", "send_summary", "load_bar_rate", "mapping", "request_forward_booking", "register_training", "go_live"],
  MARCOM: ["brand_dna_wall", "audience_key_message", "content_plan_52w", "ads_planning", "first_sync_up_meeting", "go_live"],
};
export const BILLING_ANCHOR: Record<ServiceLine, string> = { ORM: "rate_structure_meeting", MARCOM: "first_sync_up_meeting" };
export const MILESTONES = new Set(["new_property", "approved", "completed", "go_live"]);
export const fullSequence = (line: ServiceLine) => [...AE_TRACK, "completed", ...SERVICE_TRACK[line]];
export const trackOf = (stage: string): OwnerTrack =>
  ["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"].includes(stage)
    ? "AE"
    : stage === "approved" || stage === "completed"
      ? "SPECIALIST"
      : "SERVICE";

/** Next stage in the linear flow (property_pending is a conditional detour from collect_data). */
export const nextStage = (line: ServiceLine, current: string) => {
  if (current === "property_pending") return "final_check";
  const seq = fullSequence(line);
  const i = seq.indexOf(current);
  return i >= 0 && i < seq.length - 1 ? seq[i + 1]! : null;
};

const FINAL_CHECK_ITEMS = [
  "Logins / report ครบถ้วน",
  "ข้อมูลในฟอร์มครบทุกช่อง",
  "รูปภาพครบและตรงกับห้องพัก",
  "ข้อมูลสำหรับเปิดระบบครบถ้วน",
];
const HANDOVER_SEED: Record<ServiceLine, string[]> = {
  ORM: ["BAR rate sheet handed over", "OTA access confirmed", "Property data pack complete"],
  MARCOM: ["Brand assets handed over", "Meta / TikTok access confirmed", "Property data pack complete"],
};

/* ---------------- day math (§4) ---------------- */

const DAY = 86_400_000;
export const dateOnly = (iso: string | Date) => {
  const d = new Date(iso);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};
export const daysBetween = (a: string | Date, b: string | Date) => Math.round((dateOnly(b) - dateOnly(a)) / DAY);
export const fmtDayMon = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/* ---------------- state ---------------- */

type State = {
  cards: OnboardingCard[];
  events: StageEvent[];
  finalChecks: FinalCheckItem[];
  handover: HandoverItem[];
  handoverSurveys: HandoverSurvey[];
  customerSurveys: CustomerSurvey[];
};
const KEY = "meridia.ps.servicing.v5_0";
const rid = () => Math.random().toString(36).slice(2, 10);
const isoAt = (base: number, d: number) => new Date(base + d * DAY).toISOString();

function buildCard(
  s: State,
  opts: {
    id: string;
    property_id: string;
    name: string;
    line: ServiceLine;
    ref: string;
    createdDaysAgo: number;
    gaps: number[]; // gap (days) before each subsequent stage
    pending?: number; // inserts property_pending with this gap after collect_data
  },
) {
  const created = Date.now() - opts.createdDaysAgo * DAY;
  const seq = fullSequence(opts.line);
  if (opts.pending !== undefined) seq.splice(3, 0, "property_pending");
  const reached = seq.slice(0, opts.gaps.length + 1);
  let cursor = 0;
  const events: StageEvent[] = reached.map((stage, i) => {
    if (i > 0) cursor += opts.gaps[i - 1]!;
    return { id: rid(), card_id: opts.id, stage_key: stage, entered_at: isoAt(created, Math.min(cursor, opts.createdDaysAgo)), owner_track: trackOf(stage) };
  });
  const at = (k: string) => events.find((e) => e.stage_key === k)?.entered_at ?? null;
  const anchor = BILLING_ANCHOR[opts.line];
  const card: OnboardingCard = {
    id: opts.id,
    property_id: opts.property_id,
    property_name: opts.name,
    service_line: opts.line,
    contract_ref: opts.ref,
    created_at: new Date(created).toISOString(),
    current_stage: reached[reached.length - 1]!,
    assigned_ae_id: "AE · Ploy",
    assigned_specialist_id: "Specialist · Mint",
    assigned_service_owner_id: opts.line === "ORM" ? "ORM · Boss" : "Marcom · Fah",
    billing_start_at: at(anchor),
    billing_anchor_stage: anchor,
    go_live_at: at("go_live"),
    meeting_record_url: at("completed") ? "https://meet.google.com/rec-" + opts.id.toLowerCase() : null,
    pre_service_form_ref: `WS2-${opts.id}`,
    form_completion_status: at("final_check") ? "complete" : at("collect_data") ? "in_progress" : "not_started",
  };
  s.cards.push(card);
  s.events.push(...events);
  const approvedAt = at("approved");
  FINAL_CHECK_ITEMS.forEach((label) =>
    s.finalChecks.push({ id: rid(), card_id: opts.id, item_label: label, checked: !!approvedAt, checked_at: approvedAt }),
  );
  const completedAt = at("completed");
  HANDOVER_SEED[opts.line].forEach((label) =>
    s.handover.push({
      id: rid(),
      card_id: opts.id,
      item_label: label,
      specialist_checked: !!completedAt,
      specialist_checked_at: completedAt,
      verifier_checked: !!completedAt,
      verifier_checked_at: completedAt,
    }),
  );
  if (completedAt) {
    const submitted = opts.createdDaysAgo % 2 === 0;
    s.handoverSurveys.push({
      id: rid(),
      card_id: opts.id,
      evaluatee_specialist_id: card.assigned_specialist_id,
      evaluator_service_id: card.assigned_service_owner_id,
      score: submitted ? 4 : null,
      comment: null,
      submitted_at: submitted ? completedAt : null,
      window_expires_at: new Date(new Date(completedAt).getTime() + 7 * DAY).toISOString(),
      status: submitted ? "submitted" : "pending",
    });
  }
  if (card.billing_start_at)
    s.customerSurveys.push({
      id: rid(),
      card_id: opts.id,
      dispatched_at: card.billing_start_at,
      responded_at: null,
      score_bd: null,
      score_ae: null,
      score_service_exp: null,
      score_strategy: null,
      nps: null,
      comment: null,
      optional: true,
    });
}

function seed(): State {
  const s: State = { cards: [], events: [], finalChecks: [], handover: [], handoverSurveys: [], customerSurveys: [] };
  const orm = (n: number) => Array(n).fill(0);
  // full ORM path = 4 AE gaps + approved→completed + 7 service = 12 gaps; Marcom = 11 gaps
  const live = (aeGaps: number[], spec: number, svc: number[]) => [...aeGaps, spec, ...svc];
  buildCard(s, { id: "OB-101", property_id: "P-01", name: "Hotel Aurora BKK", line: "ORM", ref: "#1", createdDaysAgo: 120, gaps: live([2, 5, 6, 3], 4, [3, 2, 4, 5, 3, 4, 6]) });
  buildCard(s, { id: "OB-102", property_id: "P-01", name: "Hotel Aurora BKK", line: "MARCOM", ref: "#2", createdDaysAgo: 120, gaps: live([2, 5, 6, 3], 5, [6, 5, 7, 6, 8, 9]) });
  buildCard(s, { id: "OB-103", property_id: "P-02", name: "Sea Breeze Phuket", line: "ORM", ref: "#1", createdDaysAgo: 95, gaps: live([1, 4, 5, 2], 3, [2, 3, 3, 4, 2, 3, 5]) });
  buildCard(s, { id: "OB-104", property_id: "P-02", name: "Sea Breeze Phuket", line: "MARCOM", ref: "#2", createdDaysAgo: 95, gaps: [1, 4, 5, 2, 4, 6, 5] });
  buildCard(s, { id: "OB-105", property_id: "P-03", name: "42 Grand Residence", line: "ORM", ref: "#1", createdDaysAgo: 150, pending: 18, gaps: live([3, 6, 18, 9, 4], 6, [5, 4, 6, 8, 6, 7, 9]) });
  buildCard(s, { id: "OB-106", property_id: "P-03", name: "42 Grand Residence", line: "MARCOM", ref: "#2", createdDaysAgo: 150, pending: 18, gaps: live([3, 6, 18, 9, 4], 5, [7, 6, 8, 7, 9, 8]) });
  buildCard(s, { id: "OB-107", property_id: "P-04", name: "Chiang Mai Lanna Hill", line: "ORM", ref: "#1", createdDaysAgo: 80, gaps: live([2, 4, 4, 3], 3, [3, 2, 3, 4, 3, 3, 4]) });
  buildCard(s, { id: "OB-108", property_id: "P-05", name: "Riverside Boutique", line: "ORM", ref: "#1", createdDaysAgo: 70, gaps: live([1, 5, 5, 2], 4, [2, 3, 4, 3, 2, 4, 5]) });
  buildCard(s, { id: "OB-109", property_id: "P-06", name: "Hua Hin Coral Bay", line: "MARCOM", ref: "#1", createdDaysAgo: 90, gaps: live([2, 4, 5, 3], 4, [5, 4, 6, 5, 6, 7]) });
  buildCard(s, { id: "OB-110", property_id: "P-07", name: "Pattaya Skyline", line: "ORM", ref: "#1", createdDaysAgo: 40, gaps: [2, 6, 7, 3, 2, 3] });
  buildCard(s, { id: "OB-111", property_id: "P-08", name: "Krabi Cliff Villas", line: "MARCOM", ref: "#1", createdDaysAgo: 12, gaps: [2, 6] });
  buildCard(s, { id: "OB-112", property_id: "P-04", name: "Chiang Mai Lanna Hill", line: "MARCOM", ref: "#2", createdDaysAgo: 3, gaps: [] });
  void orm;
  return s;
}

/* ---------------- computed helpers ---------------- */

export const eventsOf = (s: Pick<State, "events">, id: string) =>
  s.events.filter((e) => e.card_id === id).sort((a, b) => a.entered_at.localeCompare(b.entered_at));

export function sums(card: OnboardingCard, events: StageEvent[]) {
  const at = (k: string) => events.find((e) => e.stage_key === k)?.entered_at ?? null;
  const fc = at("final_check");
  const ap = at("approved");
  const co = at("completed");
  return {
    ae: fc ? daysBetween(card.created_at, fc) : null,
    specialist: ap && co ? daysBetween(ap, co) : null,
    service: ap && card.go_live_at ? daysBetween(ap, card.go_live_at) : null,
    overall: card.go_live_at ? daysBetween(card.created_at, card.go_live_at) : null,
  };
}
export const currentDay = (card: OnboardingCard) => daysBetween(card.created_at, card.go_live_at ?? new Date());
export const bottleneck = (s: ReturnType<typeof sums>): OwnerTrack | null => {
  const opts: [OwnerTrack, number | null][] = [
    ["AE", s.ae],
    ["SPECIALIST", s.specialist],
    ["SERVICE", s.service],
  ];
  const valid = opts.filter((o): o is [OwnerTrack, number] => o[1] !== null);
  if (!valid.length) return null;
  return valid.sort((a, b) => b[1] - a[1])[0]![0];
};
export const surveyStatus = (h: HandoverSurvey): HandoverSurvey["status"] =>
  h.status === "pending" && Date.now() > new Date(h.window_expires_at).getTime() ? "expired" : h.status;

export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/* ---------------- provider ---------------- */

type Ctx = State & {
  hydrated: boolean;
  role: Role;
  setRole: (r: Role) => void;
  createCard: (input: { property_name: string; service_line: ServiceLine }) => string;
  advance: (cardId: string, opts?: { to?: string; meetingUrl?: string }) => { ok: boolean; error?: string };
  canAdvance: (cardId: string) => { ok: boolean; reason?: string };
  setEventDate: (eventId: string, iso: string) => void;
  toggleFinalCheck: (itemId: string) => void;
  toggleHandover: (itemId: string, col: "specialist" | "verifier") => void;
  addHandover: (cardId: string, label: string) => void;
  editHandover: (itemId: string, label: string) => void;
  deleteHandover: (itemId: string) => void;
  submitHandoverSurvey: (id: string, score: number, comment: string) => void;
  submitCustomerSurvey: (id: string, patch: Partial<CustomerSurvey>) => void;
  setFormStatus: (cardId: string, st: FormStatus) => void;
  reset: () => void;
};
const C = createContext<Ctx | null>(null);

export function ServicingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ cards: [], events: [], finalChecks: [], handover: [], handoverSurveys: [], customerSurveys: [] }));
  const [role, setRole] = useState<Role>("specialist");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setState(raw ? (JSON.parse(raw) as State) : seed());
    } catch {
      setState(seed());
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);
  /* scheduled check: flip pending → expired after the 7-day window */
  useEffect(() => {
    if (!hydrated) return;
    const tick = () =>
      setState((s) =>
        s.handoverSurveys.some((h) => surveyStatus(h) !== h.status)
          ? { ...s, handoverSurveys: s.handoverSurveys.map((h) => ({ ...h, status: surveyStatus(h) })) }
          : s,
      );
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [hydrated]);

  const value = useMemo<Ctx>(() => {
    const gate = (s: State, cardId: string): { ok: boolean; reason?: string } => {
      const card = s.cards.find((c) => c.id === cardId);
      if (!card) return { ok: false, reason: "ไม่พบการ์ด" };
      const nxt = nextStage(card.service_line, card.current_stage);
      if (!nxt) return { ok: false, reason: "Go Live แล้ว" };
      if (nxt === "approved") {
        if (s.finalChecks.some((f) => f.card_id === cardId && !f.checked)) return { ok: false, reason: "ติ๊ก Final Check ให้ครบก่อน" };
        if (role !== "specialist" && role !== "pm") return { ok: false, reason: "Approve ได้เฉพาะ Specialist / PM" };
      }
      if (nxt === "completed" && s.handover.some((h) => h.card_id === cardId && !(h.specialist_checked && h.verifier_checked)))
        return { ok: false, reason: "Handover checklist ต้องติ๊กครบทั้ง 2 ฝั่ง" };
      if (nxt === "completed" && role !== "specialist" && role !== "pm") return { ok: false, reason: "Specialist เป็นผู้กด Completed" };
      return { ok: true };
    };
    return {
      ...state,
      hydrated,
      role,
      setRole,
      canAdvance: (id) => gate(state, id),
      createCard: ({ property_name, service_line }) => {
        const id = `OB-${Date.now().toString().slice(-5)}`;
        const now = new Date().toISOString();
        setState((s) => {
          const sibling = s.cards.find((c) => c.property_name.trim().toLowerCase() === property_name.trim().toLowerCase());
          const property_id = sibling?.property_id ?? `P-${rid()}`;
          const count = s.cards.filter((c) => c.property_id === property_id).length;
          const card: OnboardingCard = {
            id,
            property_id,
            property_name,
            service_line,
            contract_ref: `#${count + 1}`,
            created_at: now,
            current_stage: "new_property",
            assigned_ae_id: "AE · Ploy",
            assigned_specialist_id: "Specialist · Mint",
            assigned_service_owner_id: service_line === "ORM" ? "ORM · Boss" : "Marcom · Fah",
            billing_start_at: null,
            billing_anchor_stage: BILLING_ANCHOR[service_line],
            go_live_at: null,
            meeting_record_url: null,
            pre_service_form_ref: null,
            form_completion_status: "not_started",
          };
          return {
            ...s,
            cards: [card, ...s.cards],
            events: [...s.events, { id: rid(), card_id: id, stage_key: "new_property", entered_at: now, owner_track: "AE" }],
            finalChecks: [...s.finalChecks, ...FINAL_CHECK_ITEMS.map((l) => ({ id: rid(), card_id: id, item_label: l, checked: false, checked_at: null }))],
            handover: [
              ...s.handover,
              ...HANDOVER_SEED[service_line].map((l) => ({
                id: rid(),
                card_id: id,
                item_label: l,
                specialist_checked: false,
                specialist_checked_at: null,
                verifier_checked: false,
                verifier_checked_at: null,
              })),
            ],
          };
        });
        return id;
      },
      advance: (cardId, opts) => {
        const g = gate(state, cardId);
        const card = state.cards.find((c) => c.id === cardId)!;
        const to = opts?.to ?? (card ? nextStage(card.service_line, card.current_stage) : null);
        if (!opts?.to && !g.ok) return { ok: false, ...(g.reason ? { error: g.reason } : {}) };
        if (!to) return { ok: false, error: "ไม่มีขั้นถัดไป" };
        if (to === "completed" && !opts?.meetingUrl?.trim()) return { ok: false, error: "ต้องใส่ลิงก์ Meeting record" };
        const now = new Date().toISOString();
        setState((s) => {
          const ev: StageEvent = { id: rid(), card_id: cardId, stage_key: to, entered_at: now, owner_track: trackOf(to) };
          const isAnchor = to === card.billing_anchor_stage;
          return {
            ...s,
            events: [...s.events, ev],
            cards: s.cards.map((c) =>
              c.id !== cardId
                ? c
                : {
                    ...c,
                    current_stage: to,
                    ...(to === "go_live" ? { go_live_at: now } : {}),
                    ...(isAnchor ? { billing_start_at: now } : {}),
                    ...(to === "completed" ? { meeting_record_url: opts?.meetingUrl ?? null } : {}),
                  },
            ),
            handoverSurveys:
              to === "completed"
                ? [
                    ...s.handoverSurveys,
                    {
                      id: rid(),
                      card_id: cardId,
                      evaluatee_specialist_id: card.assigned_specialist_id,
                      evaluator_service_id: card.assigned_service_owner_id,
                      score: null,
                      comment: null,
                      submitted_at: null,
                      window_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
                      status: "pending",
                    },
                  ]
                : s.handoverSurveys,
            customerSurveys: isAnchor
              ? [
                  ...s.customerSurveys,
                  {
                    id: rid(),
                    card_id: cardId,
                    dispatched_at: now,
                    responded_at: null,
                    score_bd: null,
                    score_ae: null,
                    score_service_exp: null,
                    score_strategy: null,
                    nps: null,
                    comment: null,
                    optional: true,
                  },
                ]
              : s.customerSurveys,
          };
        });
        return { ok: true };
      },
      setEventDate: (eventId, iso) =>
        setState((s) => {
          const ev = s.events.find((e) => e.id === eventId);
          if (!ev) return s;
          return {
            ...s,
            events: s.events.map((e) => (e.id === eventId ? { ...e, entered_at: iso } : e)),
            cards: s.cards.map((c) => {
              if (c.id !== ev.card_id) return c;
              if (ev.stage_key === "new_property") return { ...c, created_at: iso };
              if (ev.stage_key === "go_live") return { ...c, go_live_at: iso };
              if (ev.stage_key === c.billing_anchor_stage) return { ...c, billing_start_at: iso };
              return c;
            }),
          };
        }),
      toggleFinalCheck: (itemId) =>
        setState((s) => ({
          ...s,
          finalChecks: s.finalChecks.map((f) =>
            f.id === itemId ? { ...f, checked: !f.checked, checked_at: f.checked ? null : new Date().toISOString() } : f,
          ),
        })),
      toggleHandover: (itemId, col) =>
        setState((s) => ({
          ...s,
          handover: s.handover.map((h) => {
            if (h.id !== itemId) return h;
            const now = new Date().toISOString();
            return col === "specialist"
              ? { ...h, specialist_checked: !h.specialist_checked, specialist_checked_at: h.specialist_checked ? null : now }
              : { ...h, verifier_checked: !h.verifier_checked, verifier_checked_at: h.verifier_checked ? null : now };
          }),
        })),
      addHandover: (cardId, label) =>
        setState((s) => ({
          ...s,
          handover: [
            ...s.handover,
            { id: rid(), card_id: cardId, item_label: label, specialist_checked: false, specialist_checked_at: null, verifier_checked: false, verifier_checked_at: null },
          ],
        })),
      editHandover: (itemId, label) =>
        setState((s) => ({ ...s, handover: s.handover.map((h) => (h.id === itemId ? { ...h, item_label: label } : h)) })),
      deleteHandover: (itemId) => setState((s) => ({ ...s, handover: s.handover.filter((h) => h.id !== itemId) })),
      submitHandoverSurvey: (id, score, comment) =>
        setState((s) => ({
          ...s,
          handoverSurveys: s.handoverSurveys.map((h) =>
            h.id === id ? { ...h, score, comment, submitted_at: new Date().toISOString(), status: "submitted" } : h,
          ),
        })),
      submitCustomerSurvey: (id, patch) =>
        setState((s) => ({
          ...s,
          customerSurveys: s.customerSurveys.map((c) => (c.id === id ? { ...c, ...patch, responded_at: new Date().toISOString() } : c)),
        })),
      setFormStatus: (cardId, st) =>
        setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, form_completion_status: st } : c)) })),
      reset: () => setState(seed()),
    };
  }, [state, hydrated, role]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useServicing = () => {
  const c = useContext(C);
  if (!c) throw new Error("useServicing must be used inside ServicingProvider");
  return c;
};
