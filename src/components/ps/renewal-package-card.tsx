/* O-26 PK2–PK8 — "แพ็กเกจบริการ" card in the renewal Wizard step 2 (above the billing-model card).
 * Options come only from the Product Catalog; writes only through renewal-store updatePackage / updatePackageReason. */
import { useState } from "react";
import { toast } from "sonner";

import { Chip } from "@/components/crm/crm-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { mainCatalogProducts } from "@/lib/main-contract-store";
import { svcOfPackage } from "@/lib/renewal-contract";
import {
  CHANNELS_OF, ORM_TIER_LABEL, PACKAGE_REASONS, diffLines, lineFromProduct, marcomOptions, monthlySum, ormAddonOptions, ormLine, ormTierOf, ormTierPrice,
  packageLabel, packageReasonValid, setupSuggestions, validatePackage, type OrmTier, type PkgLine,
} from "@/lib/renewal-package";
import type { RenewalRequest } from "@/lib/renewal-rules";
import { oldPackageLines, updatePackage, updatePackageReason } from "@/lib/renewal-store";
import type { Channel } from "@/lib/header-contract-join";
import type { OfferTerms } from "@/lib/renewalOffer";
import { cn } from "@/lib/utils";

const thb = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const TIERS: OrmTier[] = ["LITE", "SMART", "FIXED", "PERFORMANCE"];

/** D3: Lite → full price = the Renewal Offer recommendation when there is one, else the catalog price of the tier. */
function fullTierTerms(req: RenewalRequest, tier: OrmTier): Partial<OfferTerms> & { billing_model: OfferTerms["billing_model"] } {
  const reco = req.reco_snapshot; const v = (k: string) => reco.values?.find((x) => x.key === k)?.default ?? null;
  if (reco.model && reco.values?.length && reco.type !== "NONE") return { billing_model: reco.model, fixed_fee: v("fixed_fee"), commission_pct: v("commission_pct"), guarantee_fee: v("guarantee_fee") };
  const p = ormTierPrice(mainCatalogProducts(), tier);
  const fee = p?.fee ?? null; const comm = p?.commission_pct ?? null;
  return { billing_model: fee && !comm ? "FLAT" : "FIXED_PLUS_COMMISSION", fixed_fee: fee, commission_pct: comm, guarantee_fee: null };
}

export function RenewalPackageCard({ req, editable }: { req: RenewalRequest; editable: boolean }) {
  const svc = svcOfPackage(req.old_terms.package);
  const products = mainCatalogProducts();
  const oldL = req.old_lines ?? oldPackageLines(req);
  const [changing, setChanging] = useState(!!req.package_changed);
  const [err, setErr] = useState<string | null>(null);
  const newL = req.package_changed && req.new_lines ? req.new_lines : oldL;

  const save = (lines: PkgLine[] | null, extra: Parameters<typeof updatePackage>[2] = {}) => {
    if (lines) { const e = validatePackage(svc, products, oldL, lines); setErr(e); if (e) return; }
    const waived = req.package_changed ? setupSuggestions(products, oldL, newL).filter((s) => !(req.setup_lines ?? []).some((x) => x.sku === s.sku)).map((s) => s.sku) : [];
    const setup = lines ? (extra.setup ?? setupSuggestions(products, oldL, lines).filter((s) => !waived.includes(s.sku))) : [];
    const o = updatePackage(req.id, lines, { ...extra, setup }); if (!o.ok) { setErr(o.error); toast.error(o.error); }
  };

  const pickTier = (t: OrmTier) => {
    const addons = newL.filter((l) => !ormTierOf([l]));
    if (t === "LITE") { save([ormLine(products, t, null, null), ...addons]); return; }
    const terms = fullTierTerms(req, t);
    const fee = terms.fixed_fee ?? 0; const comm = terms.commission_pct ?? 0;
    save([ormLine(products, t, fee || null, comm || null), ...addons.filter((a) => oldL.some((o) => o.sku === a.sku))],
      ormTierOf(oldL) === "LITE" ? { terms: { billing_model: terms.billing_model, fixed_fee: terms.fixed_fee ?? null, guarantee_fee: terms.guarantee_fee ?? null, fee_amount: fee, commission_pct: comm } } : {});
  };
  const toggleLine = (l: PkgLine, on: boolean) => save(on ? [...newL, l] : newL.filter((x) => x.sku !== l.sku));
  const toggleChannel = (ch: Channel, on: boolean) => {
    const opts = marcomOptions(products)[ch];
    if (!on) { save(newL.filter((l) => !CHANNELS_OF(l).includes(ch))); return; }
    const had = oldL.filter((l) => CHANNELS_OF(l).includes(ch));
    const first = opts.find((p) => p.category === "monthly" && p.base_price != null) ?? opts.find((p) => p.category === "monthly");
    save([...newL, ...(had.length ? had : first ? [lineFromProduct(first)] : [])]);
  };
  const setPrice = (sku: string, price: number | null) => save(newL.map((l) => (l.sku === sku ? { ...l, unit_price: price } : l)));

  const d = diffLines(oldL, newL);
  const oldFee = req.old_terms.fee_amount; const newFee = req.new_terms.fee_amount;
  const diff = newFee - oldFee; const pct = oldFee > 0 ? (diff / oldFee) * 100 : 0;
  const suggestions = setupSuggestions(products, oldL, newL);
  const tier = ormTierOf(newL);
  const reason = req.package_change_reason ?? { code: null, text: "" };

  return (
    <section aria-label="แพ็กเกจบริการ" className="mb-3 space-y-3 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">แพ็กเกจบริการ</p>
        <div className="flex gap-1" role="radiogroup" aria-label="แพ็กเกจ">
          {([["keep", "คงแพ็กเกจเดิม"], ["change", "เปลี่ยนแพ็กเกจ"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={(k === "change") === changing} disabled={!editable}
              onClick={() => { setChanging(k === "change"); setErr(null); if (k === "keep" && req.package_changed) save(null); }}
              className={cn("rounded-full border px-3 py-1 text-xs", (k === "change") === changing ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{label}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">แพ็กเกจปัจจุบัน: <b>{packageLabel(svc, oldL)}</b> · เปลี่ยนได้เฉพาะในบริการเดิม (ข้ามบริการต้องทำสัญญาใหม่ผ่าน BD)</p>

      {changing && svc === "ORM" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="แพ็กเกจ ORM">
            {TIERS.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tier === t} disabled={!editable} onClick={() => pickTier(t)}
                className={cn("rounded-md border px-3 py-1.5 text-xs", tier === t ? "border-primary bg-primary/10 font-semibold" : "")}>
                {ORM_TIER_LABEL[t]}{t === "LITE" && <span className="ml-1 text-muted-foreground">(มาตรฐาน {thb(ormTierPrice(products, "LITE")?.fee ?? 3900)} + {ormTierPrice(products, "LITE")?.commission_pct ?? 5}%)</span>}
              </button>
            ))}
          </div>
          {tier === "LITE" && (
            <div className="flex flex-wrap gap-3">
              {ormAddonOptions(products).map((p) => { const on = newL.some((l) => l.sku === p.sku); return (
                <label key={p.sku} className="flex items-center gap-1.5 text-xs"><Checkbox checked={on} disabled={!editable} onCheckedChange={(v) => toggleLine(lineFromProduct(p), !!v)} />{p.name_en} ({p.base_price != null ? thb(p.base_price) : "—"}/เดือน)</label>
              ); })}
            </div>
          )}
        </div>
      )}

      {changing && svc === "Marcom" && (
        <div className="grid gap-2 md:grid-cols-3">
          {(["Meta", "TikTok", "Google"] as Channel[]).map((ch) => {
            const on = newL.some((l) => CHANNELS_OF(l).includes(ch)); const opts = marcomOptions(products)[ch];
            return (
              <div key={ch} className="rounded-md border p-2">
                <label className="flex items-center gap-1.5 font-medium"><Checkbox aria-label={`ช่องทาง ${ch}`} checked={on} disabled={!editable} onCheckedChange={(v) => toggleChannel(ch, !!v)} />{ch}</label>
                {on && (
                  <div className="mt-1 space-y-1">
                    {opts.map((p) => { const has = newL.some((l) => l.sku === p.sku); return (
                      <label key={p.sku} className="flex items-center gap-1.5 text-xs"><Checkbox checked={has} disabled={!editable} onCheckedChange={(v) => toggleLine(lineFromProduct(p), !!v)} />{p.name_en}</label>
                    ); })}
                    {newL.filter((l) => CHANNELS_OF(l).includes(ch) && !opts.some((p) => p.sku === l.sku)).map((l) => <p key={l.sku} className="text-xs text-muted-foreground">{l.name} · คงเดิม</p>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}

      {req.package_changed && (
        <>
          <table className="w-full text-xs" aria-label="เทียบแพ็กเกจก่อน / หลัง">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1">บริการ</th><th>สถานะ</th><th className="text-right">ราคา/เดือน</th></tr></thead>
            <tbody>
              {d.added.map((l) => (
                <tr key={`a-${l.sku}`} className="text-success"><td className="py-1">{l.name}</td><td>เพิ่ม</td>
                  <td className="text-right">{svc === "Marcom" ? <Input aria-label={`ราคา ${l.name}`} disabled={!editable} type="number" className="ml-auto h-7 w-28 text-right" value={l.unit_price ?? ""} onChange={(e) => setPrice(l.sku, e.target.value === "" ? null : Number(e.target.value))} /> : l.unit_price != null ? thb(l.unit_price) : "ตามเงื่อนไขด้านล่าง"}</td></tr>
              ))}
              {d.removed.map((l) => <tr key={`r-${l.sku}`} className="text-destructive line-through"><td className="py-1">{l.name}</td><td>ตัด</td><td className="text-right">{l.unit_price != null ? thb(l.unit_price) : "—"}</td></tr>)}
              {d.kept.map((l) => <tr key={`k-${l.sku}`} className="text-muted-foreground"><td className="py-1">{l.name}</td><td>คงเดิม</td><td className="text-right">{l.unit_price != null ? thb(l.unit_price) : "—"}</td></tr>)}
            </tbody>
          </table>
          <p>ค่าบริการรายเดือน: {thb(oldFee)} → <b>{thb(newFee)}</b> ({diff >= 0 ? "+" : ""}{thb(diff)} · {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
            {svc === "Marcom" && monthlySum(newL) !== newFee && <span className="text-muted-foreground"> · รวมรายการ {thb(monthlySum(newL))}</span>}
            {req.offer_expected_avg != null && <> · ค่าเฉลี่ยที่คาดหวัง <b>{thb(req.offer_expected_avg)}</b>/เดือน</>}</p>
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">ค่า setup ช่องทางใหม่ (ค่าแนะนำ · ยกเว้นได้ ต้อง PM อนุมัติอยู่แล้ว)</p>
              {suggestions.map((sg) => { const on = (req.setup_lines ?? []).some((x) => x.sku === sg.sku); return (
                <label key={sg.sku} className="flex items-center gap-1.5 text-xs"><Checkbox checked={on} disabled={!editable}
                  onCheckedChange={(v) => save(newL, { setup: v ? [...(req.setup_lines ?? []), sg] : (req.setup_lines ?? []).filter((x) => x.sku !== sg.sku) })} />
                  {sg.name} · {sg.unit_price != null ? thb(sg.unit_price) : "ราคาตาม catalog ยังไม่กำหนด"} {on ? "" : <Chip>ยกเว้น</Chip>}</label>
              ); })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2"><Chip tone="warn">ต้อง PM อนุมัติ (เปลี่ยนแพ็กเกจ)</Chip></div>
          <div className="grid gap-2 md:grid-cols-[14rem_1fr]">
            <select aria-label="เหตุผลการเปลี่ยนแพ็กเกจ" disabled={!editable} className="h-9 rounded-md border bg-background px-2 text-sm" value={reason.code ?? ""} onChange={(e) => updatePackageReason(req.id, e.target.value || null, reason.text)}>
              <option value="">เลือกเหตุผล (บังคับ)</option>
              {PACKAGE_REASONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input aria-label="รายละเอียดเหตุผลการเปลี่ยนแพ็กเกจ" disabled={!editable} value={reason.text} onChange={(e) => updatePackageReason(req.id, reason.code, e.target.value)} placeholder={reason.code === "อื่น ๆ" ? "ระบุเหตุผล (บังคับ)" : "รายละเอียด"} />
          </div>
          {!packageReasonValid(req.package_change_reason) && <p className="text-xs text-warning-foreground">ต้องระบุเหตุผลการเปลี่ยนแพ็กเกจ</p>}
        </>
      )}
    </section>
  );
}

/** PK13: chip shown on the AE renewal card and PS card ③ while a request with a package change exists. */
export function PackageChangeChip({ req }: { req: Pick<RenewalRequest, "package_changed" | "old_lines" | "new_lines" | "old_terms"> | null | undefined }) {
  if (!req?.package_changed || !req.new_lines) return null;
  const svc = svcOfPackage(req.old_terms.package);
  return <Chip tone="info">เปลี่ยนแพ็กเกจ: {packageLabel(svc, req.old_lines ?? [])} → {packageLabel(svc, req.new_lines)}</Chip>;
}
