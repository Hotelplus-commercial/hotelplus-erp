/* PS Dashboard Tab R5 (O-18) — Renewal Offer display on card ③ การต่อสัญญา: the collapsible block "ข้อมูลประกอบการต่อสัญญา"
 * on undecided contract cards (§2) and the always-visible "ผลข้อเสนอ" lines on decided cards (§3). Read only.
 * Numbers come from the v1.4 engine via renewal-offer-source (fresh, daily) or the request's reco_snapshot / new_terms /
 * offer_expected_avg / offer_match once a request exists — never a local formula. */
import { InfoButton } from "./dash-card";
import { SignalMark } from "./signal-mark";
import { viewOfSnapshot } from "./renewal-offer-section";
import { RO, R1_TIER_TH, RN5 } from "@/lib/ps-glossary";
import type { OfferContext } from "@/lib/renewal-offer-source";
import type { RenewalRequest } from "@/lib/renewal-rules";
import type { BillingModel, OfferMatch, OfferTerms, OfferType, OfferValue } from "@/lib/renewalOffer";
import { offerContextForSource, offerTermsOf, sourceContractById } from "@/lib/renewal-store";
import { isOpen, reasonLabel, stageOf, type RenewalItem } from "@/lib/renewal-r2";
import { V14_DEMO } from "@/lib/renewal-offer-demo";
import { r5DemoOfferById } from "@/lib/renewal-r5-demo";
import { DECIDED_TAG_TH, DECIDED_TAG_TONE, decidedTag, deltaOf, isGroup1, shortReco, shortTerms } from "@/lib/renewal-r5";
import type { RenewalReason } from "@/lib/renewal-reasons";
import { cn } from "@/lib/utils";
import { partnerDataFor } from "@/lib/debt-partner-store";
import { getContractSystemCost, getPrepaidUntil, monthsOver, type SystemCost } from "@/lib/debt-partner-calc";
import { PARTNER_DEMO_CONTRACTS } from "@/lib/debt-partner-demo";
import { DEMO_DAY } from "@/lib/demo-session";
import { mainContractById } from "@/lib/main-contract-store";
import { NO_ALLOTMENT_TH } from "@/lib/debt-partner-calc";

/** Debt Partner R1 §9 — the two Partner rows of the block (numbers from debt-partner-calc only). */
export type SysRow = { marcom: boolean; cost: SystemCost | null; prepaid: string | null; beyond: number };
export function sysRowFor(i: Pick<RenewalItem, "contract_id" | "service" | "end">, demo: boolean): SysRow {
  if (i.service !== "ORM") return { marcom: true, cost: null, prepaid: null, beyond: 0 };
  const d = partnerDataFor(demo);
  const c = (demo ? PARTNER_DEMO_CONTRACTS.find((x) => x.contract_id === i.contract_id) : undefined)
    ?? { contract_id: i.contract_id, hotel: "", service: "ORM" as const, allotment: null, start: null, end: i.end ?? null, end_reason: null, property_id: mainContractById(i.contract_id)?.hotel_id ?? null };
  const cost = getContractSystemCost(d, c, demo ? DEMO_DAY : new Date().toISOString().slice(0, 10));
  const prepaid = getPrepaidUntil(d, i.contract_id);
  const end = c.end ?? i.end ?? null;
  return { marcom: false, cost, prepaid, beyond: prepaid && end ? monthsOver(end, prepaid) : 0 };
}
const sysThb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;
const dmy = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });

export type OfferReco = { type: OfferType; model: BillingModel | null; values: OfferValue[]; avg_before: number | null; expected_avg: number | null };
export type OfferInfo = {
  /** Recommendation type for the highlight chips (null = no recommendation data). */
  type: OfferType | null; reco: OfferReco | null; ctx: OfferContext | null;
  req: RenewalRequest | null; offered: OfferTerms | null; oldModel: BillingModel | null; match: OfferMatch | null; offerAvg: number | null;
  overdue: boolean;
  /** Debt Partner R1 §9 */
  sys?: SysRow;
};
const thb = (n: number | null | undefined) => (n == null ? "—" : `฿${Math.round(n).toLocaleString("en-US")}`);

/** One card's offer info. Fresh engine result until a request exists, then the request's snapshot. */
export function offerInfoFor(i: RenewalItem, req: RenewalRequest | null, demo: boolean): OfferInfo {
  const r = req && req.status !== "CANCELLED" ? req : null;
  const r5 = demo ? r5DemoOfferById(i.contract_id) : null;
  if (r5) {
    const o = r5.offer;
    return { type: o.type, reco: { type: o.type, model: o.model, values: o.values, avg_before: o.avg_before, expected_avg: o.expected_avg }, ctx: null, req: null,
      offered: r5.offered, oldModel: r5.old_model, match: r5.offer_match, offerAvg: r5.offer_expected_avg, overdue: !!o.overdue?.own, sys: sysRowFor(i, demo) };
  }
  let ctx: OfferContext | null = null;
  if (isOpen(i)) { try { const src = sourceContractById(i.contract_id, i.service); ctx = src ? offerContextForSource(src) : null; } catch { ctx = null; } }
  const snap = r ? viewOfSnapshot(r.reco_snapshot) : null;
  const reco: OfferReco | null = snap ? { type: snap.type, model: snap.model, values: snap.values, avg_before: snap.avg_before, expected_avg: snap.expected_avg }
    : !r && ctx ? { type: ctx.offer.type, model: ctx.offer.model, values: ctx.offer.values, avg_before: ctx.offer.avg_before, expected_avg: ctx.offer.expected_avg } : null;
  return {
    type: reco?.type ?? null, reco, ctx, req: r, offered: r ? offerTermsOf(r.new_terms) : null, oldModel: r?.old_terms.billing_model ?? null,
    match: r?.offer_match ?? null, offerAvg: r?.offer_expected_avg ?? null,
    overdue: snap ? !!snap.overdue?.own : !!ctx?.offer.overdue?.own,
    sys: sysRowFor(i, demo),
  };
}

/** DEMO: the v1.4 demo contracts as board cards (stage from their demo request, days left from the DEMO clock on the card). */
export function v14BoardItems(requests: RenewalRequest[]): RenewalItem[] {
  return V14_DEMO.map((d) => {
    const req = [...requests].reverse().find((r) => r.renewal_card_id === d.card_id && r.status !== "CANCELLED") ?? null;
    const s = stageOf({ card: "ON_PROCESS", request: req?.status ?? null });
    return {
      contract_id: d.contract_id, hotel_id: d.hotel_id, hotel_name: d.hotel, hotel_name_th: null, hotel_name_en: d.hotel, service: d.service, ae: "AE001-Nont",
      team: d.service === "ORM" ? "A" : "แนน", end: d.end, stage: s.stage, sub: s.sub, outcome: s.outcome, card_id: d.card_id, created_source: "BOT",
      request_created_at: req?.created_at ?? null, pending_since: req?.status === "PENDING_APPROVAL" ? req.submitted_at : null, link_sent_at: req?.link_sent_at ?? null, signed_at: req?.signed_at ?? null,
      last_activity: null, legacy_reason: null,
    };
  });
}

const typeChipCls = (t: OfferType) => cn("rn5-type", t === "RAISE" ? "is-up" : t === "LOWER" ? "is-down" : "is-keep");
const tierDot = { R: "is-red", A: "is-amber", G: "is-green" } as const;
const chipCls = (dir: string, ae: boolean) => cn("r1-chip", ae ? "is-ae" : dir === "bad" ? "is-bad" : dir === "good" ? "is-good" : "is-opp", ae && "rn5-ae");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <><dt>{label}</dt><dd>{children}</dd></>;
}
function DeltaText({ before, after }: { before: number | null | undefined; after: number | null | undefined }) {
  const d = deltaOf(before, after);
  if (!d) return null;
  return <span className={cn("rn5-delta", d.kind === "up" && "is-up", d.kind === "down" && "is-down")}>{d.text}</span>;
}

/* ---------- §2 undecided cards ---------- */
export function OfferBlock({ info, open, onToggle }: { info: OfferInfo; open: boolean; onToggle: () => void }) {
  const B = RN5.block; const ctx = info.ctx; const reco = info.reco;
  const fee = ctx?.fee ?? null;
  // Package: the contract's own billing model when present, else the request's new_terms.
  const model = fee?.model ?? info.oldModel ?? info.offered?.billing_model ?? null;
  return (
    <div className="rn5-block" data-testid="rn5-block">
      <button type="button" className="rn5-toggle" aria-expanded={open} onClick={onToggle} data-testid="rn5-toggle">{open ? "▴" : "▾"} {B.title}</button>
      {open && (
        <dl className="rn5-grid" data-testid="rn5-body">
          <Row label={B.health}>
            {ctx?.health ? (
              <span className="rn5-health"><i className={cn("rn5-dot", tierDot[ctx.health.tier])} />{R1_TIER_TH[ctx.health.tier]}
                {ctx.health.change === "down" && <em className="is-down">{B.down}</em>}{ctx.health.change === "up" && <em className="is-up">{B.up}</em>}</span>
            ) : <span className="rn5-grey">{B.notFound}</span>}
          </Row>
          <Row label={B.labels}>
            {ctx && ctx.chips.length ? <span className="r1-chips">{ctx.chips.map((c, k) => <span key={`${c.key}-${k}`} className={chipCls(c.dir, c.ae)} data-ae={c.ae || undefined}>{c.ae ? "AE ✎ " : <SignalMark dir={c.dir} />}{c.label}</span>)}</span> : <span className="rn5-grey">{B.notFound}</span>}
          </Row>
          <Row label={B.tickets}>{ctx && ctx.tickets.length ? <b className="tabular-nums">{ctx.tickets.length}</b> : "–"}</Row>
          <Row label={B.pkg}>{model ? RO.model[model] : "—"}</Row>
          <Row label={B.current}>
            {fee?.model ? <span className="tabular-nums">{shortTerms(fee.model, fee)} <span className="rn5-grey">· {B.avg(thb(fee.avg_billed))}</span></span> : "—"}
          </Row>
          {info.sys && (
            <>
              <Row label="ต้นทุนค่าระบบ">
                <span data-testid="rn5-sys-cost">{info.sys.marcom ? "ไม่มี" : !info.sys.cost ? <span className="text-dash-watch">ยังไม่ระบุระบบ</span> : (
                  <span className="tabular-nums">{info.sys.cost.currency === "THB" ? sysThb(info.sys.cost.net) : `${info.sys.cost.currency} ${info.sys.cost.net}`} / เดือน · {info.sys.cost.partner}{info.sys.cost.fallback_tier && <span className="text-dash-watch" data-testid="rn5-sys-noallot"> · {NO_ALLOTMENT_TH}</span>}{info.sys.cost.net < info.sys.cost.base && <s className="rn5-grey"> {info.sys.cost.currency === "THB" ? sysThb(info.sys.cost.base) : `${info.sys.cost.currency} ${info.sys.cost.base}`}</s>}</span>
                )}</span>
              </Row>
              <Row label="จ่ายล่วงหน้าถึง">
                <span data-testid="rn5-sys-prepaid">{info.sys.prepaid ? <>{dmy(info.sys.prepaid)}{info.sys.beyond > 0 && <span className="text-dash-watch"> · เกินวันสิ้นสุด {info.sys.beyond} เดือน</span>}</> : "–"}</span>
              </Row>
            </>
          )}
          <Row label={B.reco}>
            {!reco || reco.type === "NONE" || !reco.model ? <span className="rn5-grey" data-testid="rn5-none">{B.none}</span> : (
              <span data-testid="rn5-reco" data-type={reco.type}><span className={typeChipCls(reco.type)}>{RO.chip[reco.type]}</span>{info.overdue && reco.type === "KEEP" && <span className="rn5-grey"> {B.overdue}</span>} <span className="tabular-nums">{shortReco(reco.type, reco.model, reco.values)}</span></span>
            )}
          </Row>
          <Row label={B.expected}>
            {reco && reco.type !== "NONE" && reco.expected_avg != null ? <span className="tabular-nums">{thb(reco.expected_avg)} <DeltaText before={reco.avg_before} after={reco.expected_avg} /></span> : "—"}
          </Row>
          {info.req && info.offered && (
            <Row label={B.aeOffer}>
              <span data-testid="rn5-ae-offer">
                {info.oldModel && info.oldModel !== info.offered.billing_model && <span className="rn5-tag" data-testid="rn5-switch">{B.switchTag}</span>}
                <span className="tabular-nums">{shortTerms(info.offered.billing_model, info.offered)}</span>
                {info.match && <span className={cn("rn5-match", info.match === "MATCH" ? "is-good" : info.match === "ABOVE" ? "is-amber" : "is-bad")} data-testid="rn5-match">{RO.match[info.match]}</span>}
              </span>
            </Row>
          )}
        </dl>
      )}
    </div>
  );
}

/* ---------- §3 decided cards ---------- */
export function OfferResult({ i, info, rec }: { i: RenewalItem; info: OfferInfo; rec: RenewalReason | null }) {
  const R = RN5.result; const reco = info.reco;
  const stage = i.stage as "RENEWED" | "LOST_OR_DECLINED";
  const tag = decidedTag({ stage, hasSnapshot: !!reco, recoType: reco?.type ?? null, match: info.match, reasons: rec ? [...rec.primary, rec.secondary] : null });
  const tone = DECIDED_TAG_TONE[tag];
  const sent = info.offered ? (info.oldModel && info.oldModel !== info.offered.billing_model
    ? `${RN5.block.switchTag} · ${RO.model[info.oldModel]} → ${RO.model[info.offered.billing_model]} · ${shortTerms(info.offered.billing_model, info.offered)}`
    : `${RO.model[info.offered.billing_model]} · ${shortTerms(info.offered.billing_model, info.offered)}`) : "—";
  return (
    <dl className="rn5-grid rn5-result" data-testid="rn5-result" data-tag={tag}>
      {tag !== "NO_SNAPSHOT" && <Row label={R.result}>{tone === "grey" ? <span className="rn5-grey">{DECIDED_TAG_TH[tag]}</span> : <span className={cn("rn5-match", `is-${tone}`)}>{DECIDED_TAG_TH[tag]}</span>}</Row>}
      <Row label={R.sent}><span className="tabular-nums">{sent}</span></Row>
      <Row label={R.reco}>{reco ? <span className="rn5-grey tabular-nums">{reco.type === "NONE" || !reco.model ? R.keepTerms : `${RO.type[reco.type]} · ${shortReco(reco.type, reco.model, reco.values)}`}</span> : <span className="rn5-grey">{DECIDED_TAG_TH.NO_SNAPSHOT}</span>}</Row>
      {reco && <Row label={R.avg}><span className="tabular-nums">{thb(reco.avg_before)} → {thb(info.offerAvg)} {stage === "RENEWED" && <DeltaText before={reco.avg_before} after={info.offerAvg} />}</span></Row>}
    </dl>
  );
}

/** Reason chip class on not-renewed cards: group-1 labels orange with a 1 px border; others keep main red / secondary amber. */
export const reasonChipCls = (key: string, main: boolean) => cn("r1-chip", isGroup1(key) ? "rn5-g1" : main ? "is-bad" : "is-amber");
export { reasonLabel };
export function OfferInfoNote() { return <InfoButton info={{ count: RN5.chipInfo }} />; }
