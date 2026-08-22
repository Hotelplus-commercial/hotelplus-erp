/* HotelPlus CRM — business rules R1–R14, tax, numbering */

import type {
  Contract,
  ContractTemplate,
  Customer,
  CustomerSnapshot,
  CustomerType,
  Invoice,
  Product,
  ProductionReport,
  Quotation,
  QuoteLine,
  Totals,
} from "@/lib/crm-types";

export const VAT_RATE = 0.07;
export const WHT_RATE = 0.03;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Subtotal + VAT 7% − WHT 3% (WHT for juristic customers only) */
export function computeTotals(
  lines: { amount: number }[],
  customerType: CustomerType | null,
): Totals {
  const subtotal = r2(lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0));
  const vat = r2(subtotal * VAT_RATE);
  const wht = customerType === "juristic" ? r2(subtotal * WHT_RATE) : 0;
  return { subtotal, vat, wht, total: r2(subtotal + vat - wht) };
}

export const emptyTotals = (): Totals => ({ subtotal: 0, vat: 0, wht: 0, total: 0 });

/* ---------------- numbering ---------------- */

/** Thai Buddhist year, 2 digits (2026 → "69") */
export const beYear = (d = new Date()) => String((d.getFullYear() + 543) % 100);

const seqOf = (ids: string[], re: RegExp) =>
  ids.reduce((max, id) => {
    const m = re.exec(id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

export const nextQuoteId = (existing: string[]) =>
  `Q-${beYear()}-${String(seqOf(existing, new RegExp(`^Q-${beYear()}-(\\d{4})`)) + 1).padStart(4, "0")}`;

export const nextContractId = (existing: string[]) =>
  `C-${beYear()}-${String(seqOf(existing, new RegExp(`^C-${beYear()}-(\\d{4})`)) + 1).padStart(4, "0")}`;

export const nextCaseNumber = (existing: string[]) =>
  `CS-${beYear()}-${String(seqOf(existing, new RegExp(`^CS-${beYear()}-(\\d{4})`)) + 1).padStart(4, "0")}`;

/** INV69XXX — sequential per Buddhist year */
export const nextInvoiceId = (existing: string[]) =>
  `INV${beYear()}${String(seqOf(existing, new RegExp(`^INV${beYear()}(\\d{3})`)) + 1).padStart(3, "0")}`;

/** RE69XXX — same stem as its invoice */
export const taxReceiptIdFor = (invoiceId: string) => invoiceId.replace(/^INV/, "RE");

export const nextCustomerId = (existing: string[]) =>
  `H${String(seqOf(existing, /^H(\d{5})$/) + 1).padStart(5, "0")}`;

/** revision id: Q-69-0142 → Q-69-0142-R2 → -R3 */
export function revisionIdFor(quoteId: string) {
  const m = /^(.*)-R(\d+)$/.exec(quoteId);
  return m ? `${m[1]}-R${Number(m[2]) + 1}` : `${quoteId}-R2`;
}

/* ---------------- snapshots ---------------- */

export function snapshotCustomer(c: Customer, hotelName?: string): CustomerSnapshot {
  return {
    customer_id: c.customer_id,
    legal_name: c.legal_name,
    type: c.type,
    tax_id: c.tax_id,
    address: c.address,
    signer_name: c.signer_name,
    contact_phone: c.contact_phone,
    contact_email: c.contact_email,
    hotel_name: hotelName ?? c.hotels[0]?.name ?? "",
  };
}

/* ---------------- R1–R4 · quote line validation ---------------- */

export type AddCheck = { ok: boolean; reason?: string };

export function canAddProduct(
  product: Product,
  packageSku: string | null,
  lines: QuoteLine[],
  products: Product[],
): AddCheck {
  if (!product.active) return { ok: false, reason: "สินค้านี้ถูกปิดการใช้งาน" };

  // R4 · package required
  if (product.packages.length && !packageSku)
    return { ok: false, reason: "ต้องเลือกแพ็กเกจก่อนเพิ่มเข้าใบเสนอราคา" };

  // R1 · tier group exclusivity
  if (product.tier_group) {
    const clash = lines.find((l) => {
      const p = products.find((x) => x.sku === l.sku_snapshot);
      return p && p.sku !== product.sku && p.tier_group === product.tier_group;
    });
    if (clash)
      return {
        ok: false,
        reason: `กลุ่ม ${product.tier_group} มี ${clash.name_snapshot} อยู่แล้ว — เลือกได้กลุ่มละ 1 รายการ`,
      };
  }

  // R2 · add-on parent gating
  if (product.parent_sku && !lines.some((l) => l.sku_snapshot === product.parent_sku))
    return { ok: false, reason: `ต้องมี ${product.parent_sku} ในใบเสนอราคาก่อน` };

  // R3 · max quantity
  if (product.max_quantity != null) {
    const used = lines
      .filter((l) => l.sku_snapshot === product.sku)
      .reduce((s, l) => s + l.quantity, 0);
    if (used >= product.max_quantity)
      return { ok: false, reason: `เพิ่มได้สูงสุด ${product.max_quantity} ครั้งต่อดีล` };
  }

  return { ok: true };
}

/** removing a parent that still has add-ons attached is blocked */
export function canRemoveLine(line: QuoteLine, lines: QuoteLine[], products: Product[]): AddCheck {
  const dependent = lines.find((l) => {
    const p = products.find((x) => x.sku === l.sku_snapshot);
    return p?.parent_sku === line.sku_snapshot;
  });
  if (dependent)
    return { ok: false, reason: `ต้องลบ ${dependent.name_snapshot} ก่อน (เป็น add-on ของรายการนี้)` };
  return { ok: true };
}

export const lineTypeOf = (p: Product): "fixed" | "commission" | "setup" =>
  p.category === "setup" ? "setup" : p.pricing_model === "commission_only" ? "commission" : "fixed";

/* ---------------- R5 · lock ---------------- */

export const isQuoteLocked = (q: Quotation) => q.status === "approved" || q.status === "revised";
export const isInvoiceLocked = (i: Invoice) => i.status !== "draft";

/** R6 · a quote can only be approved when every line carries a price (TBD blocked) */
export function quoteApprovalIssues(q: Quotation): string[] {
  const issues: string[] = [];
  if (!q.lines.length) issues.push("ยังไม่มีรายการสินค้า");
  if (!q.customer_id) issues.push("ยังไม่ได้เลือกลูกค้า (ต้อง snapshot ตอน Approve)");
  const tbd = q.lines.filter((l) => l.unit_price_snapshot == null && !l.commission_rate_snapshot);
  if (tbd.length) issues.push(`ยังมี ${tbd.length} รายการที่ราคายัง TBD`);
  return issues;
}

/* ---------------- R8 · template mapping ---------------- */

export function templateForSku(sku: string, templates: ContractTemplate[]) {
  return templates.find((t) => t.mapped_skus.includes(sku)) ?? null;
}

export function activeVersion(t: ContractTemplate) {
  return [...t.versions].sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]!;
}

/** group approved-quote lines by the template they map to (R8) */
export function groupLinesByTemplate(lines: QuoteLine[], templates: ContractTemplate[]) {
  const groups = new Map<string, { template: ContractTemplate | null; lines: QuoteLine[] }>();
  lines.forEach((l) => {
    const t = templateForSku(l.sku_snapshot, templates);
    const key = t?.template_id ?? "UNMAPPED";
    const g = groups.get(key) ?? { template: t, lines: [] };
    g.lines.push(l);
    groups.set(key, g);
  });
  return [...groups.values()];
}

/* ---------------- R9 · production report gating ---------------- */

export const commissionSkusOf = (c: Contract) =>
  c.lines.filter((l) => l.commission_rate != null).map((l) => l.sku_snapshot);

export function missingReports(
  contracts: Contract[],
  reports: ProductionReport[],
  year: number,
  month: number,
) {
  const out: { contract: Contract; sku: string }[] = [];
  contracts.forEach((c) => {
    commissionSkusOf(c).forEach((sku) => {
      const found = reports.some(
        (r) =>
          r.contract_id === c.contract_id &&
          r.sku === sku &&
          r.period_year === year &&
          r.period_month === month,
      );
      if (!found) out.push({ contract: c, sku });
    });
  });
  return out;
}

/** R9 alert window: day 4 warns, day 5 is the AC finalise date */
export function reportAlertLevel(now = new Date()): "none" | "warn" | "final" {
  const d = now.getDate();
  if (d >= 5) return "final";
  if (d >= 4) return "warn";
  return "none";
}

/* ---------------- misc ---------------- */

export const monthName = (m: number) =>
  [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ][m - 1] ?? "";

export const thb = (n: number | null | undefined) =>
  n == null
    ? "TBD"
    : n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });

export const pctLabel = (r: number | null | undefined) =>
  r == null ? "—" : `${(r * 100).toFixed(2).replace(/\.00$/, "")}%`;
