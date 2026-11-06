/* Contract Renewal v1.4 §4 / §5 / §6.1 — renewal card section 1 "ข้อมูลประกอบการต่อสัญญา" + shared recommendation box.
 * Reads only: one engine (renewalOffer.ts) via renewal-offer-source.ts. A fresh computation is shown until a request exists,
 * then the request's reco_snapshot (taken when the AE pressed ต่อสัญญา). Labels from ps-glossary RO. */
import { useState, useEffect } from "react";
import { InfoButton } from "@/components/ps/dash-card";
import { SignalMark } from "@/components/ps/signal-mark";
import { SystemCostTile } from "@/components/ps/ae-system-cost";
import { RO, R1_TIER_TH, R1_STATUS_TH } from "@/lib/ps-glossary";
import type { RenewalCard } from "@/lib/ps-renewal";
import type { RecoSnapshot, RenewalRequest } from "@/lib/renewal-rules";
import type { Alternative, BillingModel, FeeAverage, Factor, OfferValue, Reason, RenewalOffer } from "@/lib/renewalOffer";
import type { OfferContext } from "@/lib/renewal-offer-source";
import {
  cardContractId, isRenewalDemo, latestRequestFor, offerContextForSource, snapshotFee, sourceContractById, sourceContractFor, useRenewalStore,
} from "@/lib/renewal-store";
import { useTickets } from "@/lib/tickets-l0";
import { useContractHealthStore } from "@/lib/contract-health-store";
import { psDemoOn } from "@/lib/demo-session";
import { cn } from "@/lib/utils";

export const thb = (n: number | null | undefined) => (n == null ? "—" : `฿${Math.round(n).toLocaleString("th-TH")}`);
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100) / 100}%`);
const signed = (n: number, s: string) => `${n >= 0 ? "+" : "−"}${s}`;
const monthTh = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }) : "—");

/** View of a recommendation: from a fresh engine result or from a stored v1.4 snapshot. */
export type OfferView = Pick<RenewalOffer, "type" | "model" | "values" | "factors" | "overdue" | "avg_before" | "expected_avg" | "alternatives" | "missing" | "hint"> & { reasons: Reason[]; fromSnapshot: boolean };
export function viewOfOffer(o: RenewalOffer): OfferView { return { ...o, fromSnapshot: false }; }
export function viewOfSnapshot(s: RecoSnapshot): OfferView | null {
  if (s.model === undefined) return null; // stored before v1.4
  const factors = s.factors ?? [];
  const reasons: Reason[] = s.reasons.map((text) => {
    const f = factors.find((x) => text.startsWith(RO.factor[x.key] ?? "§"));
    return { kind: f ? "factor" : "count", text, tone: f ? (f.bad ? "bad" : f.bad == null ? "none" : "normal") : text.startsWith(RO.overdue) ? "bad" : "normal" };
  });
  const missing = Array.isArray(s.inputs?.["missing"]) ? (s.inputs["missing"] as string[]) : [];
  const type = s.type === "HOLD" ? "NONE" : s.type;
  return { type, model: s.model ?? null, values: s.values ?? [], factors, overdue: s.overdue ?? null, avg_before: s.avg_before ?? null, expected_avg: s.expected_avg ?? null, alternatives: s.alternatives ?? [], missing, hint: s.reasons.find((r) => r === RO.hint) ?? null, reasons, fromSnapshot: true };
}

/** DEMO for this card = the R3.3 shared DEMO state (PS Dashboard switch) or the page's ?demo=1, never ?demo=1 alone. */
export function useCardDemo(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => { setDemo(new URLSearchParams(window.location.search).get("demo") === "1" || psDemoOn()); }, []);
  return demo;
}

/** The card's context (fresh) + the view to show (snapshot once a request exists). Read only. */
export function useRenewalOffer(card: Pick<RenewalCard, "id" | "hotelId"> & Partial<Pick<RenewalCard, "contract_id" | "service" | "created_source">>): { ctx: OfferContext | null; view: OfferView | null; req: RenewalRequest | null; fee: FeeAverage | null } {
  useRenewalStore(); useTickets(); useContractHealthStore(isRenewalDemo());
  const cid = cardContractId(card);
  const src = cid ? sourceContractById(cid, card.service) : sourceContractFor(card.hotelId);
  const ctx = src ? offerContextForSource(src) : null;
  const latest = latestRequestFor(card.id);
  const req = latest && latest.status !== "CANCELLED" ? latest : null;
  const snap = req ? viewOfSnapshot(req.reco_snapshot) : null;
  return { ctx, req, view: snap ?? (ctx ? viewOfOffer(ctx.offer) : null), fee: (req && snapshotFee(req)) ?? ctx?.fee ?? null };
}

/* ---------- value text ---------- */
const keyLabel = { fixed_fee: "Monthly fee", commission_pct: "Commission", guarantee_fee: "Guarantee fee" } as const;
const fmtOf = (k: OfferValue["key"]) => (k === "commission_pct" ? pct : thb);
export function valueLines(v: OfferValue): string[] {
  const f = fmtOf(v.key); const label = keyLabel[v.key];
  if (v.min === v.old && v.max === v.old) return [`${label} ${f(v.old)} ${RO.section.unchanged}`];
  if (v.min !== v.max && !(v.max === v.old)) { // RAISE range
    const rng = v.key === "commission_pct" ? `${f(v.min)} – ${f(v.max)}` : `${f(v.min)} – ${f(v.max)} (+${Math.round(((v.min - v.old) / v.old) * 1000) / 10}–${Math.round(((v.max - v.old) / v.old) * 1000) / 10}%)`;
    return [`${label} ${f(v.old)} → ${rng}`, RO.section.startValue(f(v.default))];
  }
  const d = v.key === "commission_pct" ? "" : ` (${signed(v.default - v.old, `${Math.abs(Math.round(((v.default - v.old) / v.old) * 1000) / 10)}%`)})`;
  return [`${label} ${f(v.old)} → ${f(v.default)}${d}`];
}
/** `Monthly fee ฿7,800 + Commission 8%` / `Commission 14% · Guarantee fee ฿8,000`. */
export function termsText(model: BillingModel | null | undefined, t: { fixed_fee?: number | null; fee_amount?: number; commission_pct?: number | null; guarantee_fee?: number | null }): string {
  const fixed = t.fixed_fee ?? t.fee_amount ?? null;
  if (model === "FIXED_PLUS_COMMISSION") return `Monthly fee ${thb(fixed)} + Commission ${pct(t.commission_pct)}`;
  if (model === "COMMISSION_GUARANTEE") return `Commission ${pct(t.commission_pct)} · Guarantee fee ${thb(t.guarantee_fee)}`;
  return `Monthly fee ${thb(fixed)}`;
}
export const deltaText = (a: number | null, b: number | null) => {
  if (a == null || b == null) return "—";
  const d = b - a; const p = a ? (d / a) * 100 : 0;
  return `${signed(d, thb(Math.abs(d)))} (${signed(p, `${Math.abs(Math.round(p * 10) / 10)}%`)})`;
};
const typeBorder = (t: string) => (t === "RAISE" ? "border-success/50" : t === "LOWER" ? "border-destructive/50" : t === "KEEP" ? "border-primary/40" : "border-border");
const typeChip = (t: string) => (t === "RAISE" ? "bg-success/12 text-success" : t === "LOWER" ? "bg-destructive/12 text-destructive" : "bg-primary/10 text-primary");

/** §4 row 3 / §6.1 — the system recommendation box (alternatives table only on the card). */
export function RecoBoxV14({ view, service, packageName, alternatives = true, fee }: { view: OfferView; service: "ORM" | "Marcom"; packageName: string; alternatives?: boolean; fee?: FeeAverage | null }) {
  const [altOpen, setAltOpen] = useState(false);
  if (view.type === "NONE") {
    return (
      <div data-testid="ro-reco" data-type="NONE" className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{RO.section.reco}</span><InfoButton info={{ source: RO.section.reco, count: RO.none, read: RO.ruleInfo }} /></div>
        <p className="mt-1" data-testid="ro-none">{RO.none}</p>
        {view.missing.length > 0 && <p className="text-xs">{RO.missingLine(view.missing.map((m) => RO.missing[m] ?? m).join(" · "))}</p>}
        {view.hint && <p className="text-xs" data-testid="ro-hint">{view.hint}</p>} {/* O-26 PK4b: RP134 hint also when the offer is NONE */}
      </div>
    );
  }
  const model = view.model!;
  return (
    <div data-testid="ro-reco" data-type={view.type} className={cn("rounded-lg border-2 p-3 text-sm", typeBorder(view.type))}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{RO.section.reco}</span><span className="text-xs text-muted-foreground">{RO.section.recoSub}</span>
        <InfoButton info={{ source: RO.section.reco, count: RO.type[view.type] ?? "", read: RO.ruleInfo }} />
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", typeChip(view.type))}>{RO.chip[view.type]}</span><span className="font-medium">{packageName} · {RO.model[model]}</span></p>
          {view.values.flatMap((v) => valueLines(v).map((line, k) => <p key={`${v.key}-${k}`} className={cn("tabular-nums", k > 0 && "text-xs text-muted-foreground")}>{line}</p>))}
          <p className="rounded-md bg-muted/50 px-2 py-1.5 tabular-nums" data-testid="ro-expected">{RO.section.expected} <b>{thb(view.avg_before)} → {thb(view.expected_avg)}</b> {deltaText(view.avg_before, view.expected_avg)}</p>
          {view.hint && <p className="text-xs text-muted-foreground">{view.hint}</p>}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{RO.section.reasons}</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {view.reasons.map((r, k) => <li key={k} className={cn(r.tone === "bad" && "font-medium text-warning-foreground", r.tone === "none" && "text-muted-foreground")}>· {r.text}</li>)}
          </ul>
        </div>
      </div>
      {alternatives && (
        <div className="mt-2 border-t pt-2">
          {service === "Marcom" ? <p className="text-xs text-muted-foreground">{RO.section.marcomOne}</p> : (
            <>
              <button type="button" className="text-xs font-semibold text-primary" onClick={() => setAltOpen((o) => !o)} aria-expanded={altOpen}>{altOpen ? RO.section.altHide : RO.section.alt}</button>
              {altOpen && <AltTable alts={view.alternatives} before={view.avg_before} base={fee?.avg_revenue_base ?? null} />}
            </>
          )}
        </div>
      )}
      {alternatives && <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold">{RO.section.soon}</span>{RO.section.valueAdded}</p>}
    </div>
  );
}
function AltTable({ alts, before, base }: { alts: Alternative[]; before: number | null; base: number | null }) {
  if (!alts.length) return <p className="mt-1 text-xs text-muted-foreground">{RO.section.altNone}</p>;
  return (
    <div className="mt-1 overflow-x-auto">
      <table className="w-full text-xs" data-testid="ro-alts">
        <thead><tr className="text-left text-muted-foreground">{RO.section.altCols.map((c) => <th key={c} className="py-1 pr-2 font-medium">{c}</th>)}</tr></thead>
        <tbody>{alts.map((a) => <tr key={a.model} className="border-t"><td className="py-1 pr-2">{RO.model[a.model]}</td><td className="pr-2 tabular-nums">{termsText(a.model, a.terms)}</td><td className="pr-2 tabular-nums">{thb(a.expected_avg)}</td><td className="tabular-nums">{deltaText(before, a.expected_avg)}</td></tr>)}</tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">{RO.section.altNote(thb(base))}</p>
    </div>
  );
}

/* ---------- §4 section 1 ---------- */
const OPEN_KEY = "meridia.renewal.offerSection.open";
const tierDot = { R: "bg-destructive", A: "bg-warning", G: "bg-success" } as const;
const chipCls = (dir: string, ae: boolean) => cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
  dir === "bad" ? "bg-destructive/10 text-destructive" : dir === "good" ? "bg-success/12 text-success" : "bg-success/12 text-success", ae && "border border-dashed bg-transparent");

export function RenewalOfferSection({ card }: { card: RenewalCard }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { try { const v = sessionStorage.getItem(OPEN_KEY); if (v != null) setOpen(v === "1"); } catch { /* storage optional */ } }, []);
  const toggle = () => setOpen((o) => { try { sessionStorage.setItem(OPEN_KEY, o ? "0" : "1"); } catch { /* storage optional */ } return !o; });
  const { ctx, view, fee } = useRenewalOffer(card);
  const demo = isRenewalDemo();
  const taskHref = `/ps?tab=task${demo ? "&demo=1" : ""}`;
  const f = ctx?.fee ?? null;
  const tone = !ctx ? null : ctx.badChips >= 2 ? RO.section.tone2 : ctx.badChips === 1 ? RO.section.tone1 : ctx.opportunity ? RO.section.toneOpp : RO.section.toneOk;
  return (
    <section className="rounded-xl border p-3" data-testid="ro-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · {RO.section.title}<InfoButton info={{ source: RO.section.title, count: "", read: RO.section.info }} /></p>
        <button type="button" className="text-xs font-semibold text-primary" onClick={toggle} aria-expanded={open} data-testid="ro-toggle">{open ? RO.section.hide : RO.section.show}</button>
      </div>
      {open && (
        <div className="mt-2 space-y-3" data-testid="ro-body">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border p-2.5 text-sm" data-testid="ro-health">
              <p className="text-xs text-muted-foreground">{RO.section.health}</p>
              {ctx?.health ? (
                <>
                  <p className="mt-1 flex items-center gap-2 font-semibold"><span className={cn("size-2.5 rounded-full", tierDot[ctx.health.tier])} />{R1_TIER_TH[ctx.health.tier]}</p>
                  <p className="text-xs text-muted-foreground">{ctx.health.change === "down" ? RO.section.down(R1_TIER_TH[ctx.health.from!]) : ctx.health.change === "up" ? RO.section.up(R1_TIER_TH[ctx.health.from!]) : ctx.health.change === "same" ? RO.section.same : RO.section.noHistory}</p>
                </>
              ) : <p className="mt-1 text-muted-foreground">{RO.notFound}</p>}
            </div>
            <div className="rounded-lg border p-2.5 text-sm" data-testid="ro-tickets">
              <p className="text-xs text-muted-foreground">{RO.section.tickets}</p>
              {ctx && ctx.tickets.length ? (
                <>
                  <p className="mt-1 font-semibold tabular-nums">{ctx.tickets.length}</p>
                  <ul className="text-xs text-muted-foreground">{ctx.tickets.map((t) => <li key={t.ticket_id}>{t.ticket_id} · {t.assignee?.display ?? t.target_dept} · {R1_STATUS_TH[t.status] ?? t.status} · {new Date(t.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" })}</li>)}</ul>
                </>
              ) : <p className="mt-1 text-muted-foreground">{RO.section.none}</p>}
              <a href={taskHref} className="mt-1 inline-block text-xs font-semibold text-primary">{RO.section.ticketLink}</a>
            </div>
            <div className="rounded-lg border p-2.5 text-sm" data-testid="ro-labels">
              <p className="text-xs text-muted-foreground">{RO.section.labels}</p>
              {ctx && ctx.chips.length ? (
                <div className="mt-1 flex flex-wrap gap-1">{ctx.chips.map((c, k) => <span key={`${c.key}-${k}`} className={chipCls(c.dir, c.ae)}>{c.ae ? "✎ " : <SignalMark dir={c.dir} />}{c.label}</span>)}</div>
              ) : <p className="mt-1 text-muted-foreground">{RO.notFound}</p>}
              {ctx && (ctx.chips.length > 0 || ctx.health) && <p className="mt-1 text-xs">{tone}</p>}
            </div>
          </div>
          <div className="rounded-lg border p-2.5 text-sm" data-testid="ro-fee">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">{RO.section.fee}<InfoButton info={{ source: RO.section.fee, count: "", read: RO.section.feeInfo }} /></div>
            {f && f.model ? (
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{ctx!.package} · {RO.model[f.model]}</p>
                  {f.model !== "COMMISSION_GUARANTEE" && <p className="tabular-nums">{RO.section.fixed(thb(f.fixed_fee))}</p>}
                  {f.model !== "FLAT" && <p className="tabular-nums">{RO.section.rate(String(f.commission_pct ?? "—"))}</p>}
                  {f.model === "COMMISSION_GUARANTEE" && <p className="tabular-nums">{RO.section.guarantee(thb(f.guarantee_fee))}</p>}
                  {f.model === "FIXED_PLUS_COMMISSION" && <p className="tabular-nums">{RO.section.avgComm(thb(f.avg_commission))}</p>}
                  {f.model === "COMMISSION_GUARANTEE" && <p className="tabular-nums">{RO.section.actualComm(thb(f.avg_commission))}</p>}
                  {f.model === "COMMISSION_GUARANTEE" && f.total_months != null && <p className="tabular-nums">{RO.section.gMonths(f.guarantee_months ?? 0, f.total_months)}</p>}
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-right">
                  <p className="text-xs text-muted-foreground">{RO.section.avg}</p>
                  <p className="font-display text-xl font-bold tabular-nums">{thb(f.avg_billed)}</p>
                  <p className="text-[11px] text-muted-foreground">{RO.section.perMonth} · {RO.section.lastChange(monthTh(f.last_price_change))}</p>
                </div>
              </div>
            ) : <p className="mt-1 text-muted-foreground">{RO.notFound}{f?.missing.length ? ` · ${RO.missingLine(f.missing.map((m) => RO.missing[m] ?? m).join(" · "))}` : ""}</p>}
          </div>
          <SystemCostTile card={card} />
          {view ? <RecoBoxV14 view={view} service={ctx?.service ?? card.service ?? "ORM"} packageName={ctx?.package ?? "—"} fee={fee} /> : <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground" data-testid="ro-none">{RO.none}</p>}
        </div>
      )}
    </section>
  );
}

/** §5 — the AE offer under the ต่อสัญญา status (request exists). */
export function AeOfferLine({ req }: { req: RenewalRequest }) {
  const model = req.new_terms.billing_model;
  if (!model) return null;
  const switched = !!req.old_terms.billing_model && req.old_terms.billing_model !== model;
  const before = req.reco_snapshot.avg_before ?? null;
  const differs = req.changed_fields.length > 0 || switched;
  const sent = req.status === "LINK_SENT" || req.status === "SIGNED";
  const tag = req.offer_match;
  return (
    <div className="space-y-0.5 rounded-lg border bg-muted/20 p-2 text-xs" data-testid="ro-ae-offer">
      <p className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{RO.aeOffer(RO.model[model] ?? model)}</span>
        {switched && <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold">{RO.switchTag}</span>}
        <span className="tabular-nums">{termsText(model, req.new_terms)}</span>
        {tag && <span data-testid="ro-match" className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", tag === "MATCH" ? "bg-success/12 text-success" : tag === "ABOVE" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/12 text-destructive")}>{RO.match[tag]}</span>}
      </p>
      {req.offer_expected_avg != null && <p className="tabular-nums">{RO.offerAvg(thb(req.offer_expected_avg), deltaText(before, req.offer_expected_avg))}{differs && !sent ? ` ${RO.needPm}` : ""}</p>}
      {req.offer_expected_avg == null && differs && !sent && <p>{RO.needPm}</p>}
    </div>
  );
}
/** §5 — no request yet: the line under the ต่อสัญญา button. */
export function RenewStartLine({ view }: { view: OfferView | null }) {
  if (!view || view.type === "NONE" || !view.model) return null;
  return <p className="text-xs text-muted-foreground" data-testid="ro-start-line">{RO.startLine(RO.model[view.model] ?? view.model)}</p>;
}
export type { Factor };
