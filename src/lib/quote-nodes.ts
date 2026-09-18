/* PS App v2.2 · Fix 1 — Quote templates are built from a small set of atomic nodes
 * instead of free-form HTML. The node list is serialised into the template body as
 * <qnode .../> tags so existing versioning / snapshot logic keeps working unchanged.
 * Hardcoded copy inside each node (company info, tagline, labels, footer note) is
 * owned by branding and is NOT editable by template admins. */

export type QuotePricingFilter = "first_month" | "recurring";

export type QuoteNode =
  | { id: string; type: "ci_header" }
  | { id: string; type: "info_block" }
  | { id: string; type: "package_card" }
  | {
      id: string;
      type: "pricing_table";
      title: string;
      filter: QuotePricingFilter;
      total_field: string;
      show_commission: boolean;
    }
  | { id: string; type: "footer" }
  | { id: string; type: "caption"; text: string };

export type QuoteNodeType = QuoteNode["type"];

export const QUOTE_NODE_LABEL: Record<QuoteNodeType, string> = {
  ci_header: "QuoteCIHeader",
  info_block: "QuoteInfoBlock",
  package_card: "QuotePackageCard",
  pricing_table: "QuotePricingTable",
  footer: "QuoteFooter",
  caption: "Caption (ข้อความสั้น)",
};

export const QUOTE_NODE_HINT: Record<QuoteNodeType, string> = {
  ci_header: "แถบหัวสีเหลือง · โลโก้ · tagline · ป้ายใบประเมินค่าบริการ",
  info_block: "ข้อมูลบริษัท 2 คอลัมน์ + ตารางเลขที่/วันที่เอกสาร",
  package_card: "การ์ดชื่อแพ็กเกจ + คำอธิบาย",
  pricing_table: "ตารางราคา (ตั้งค่าหัวข้อ / ตัวกรอง / ยอดรวม / คอมมิชชั่น)",
  footer: "แถบท้ายสีเหลือง · ผู้จัดทำ · หมายเหตุ · เลขหน้า",
  caption: "ข้อความสั้นแทรกระหว่าง node (แก้ไขได้)",
};

/** Atomic nodes: admin may remove / reposition but never edit their inner copy. */
export const isAtomicQuoteNode = (t: QuoteNodeType) => t !== "caption";

export const FILTER_CATEGORIES: Record<QuotePricingFilter, string> = {
  first_month: "MTH,SETUP,ADDON",
  recurring: "MTH",
};

export const FILTER_LABEL: Record<QuotePricingFilter, string> = {
  first_month: "เดือนแรก (MTH + SETUP + ADDON)",
  recurring: "รายเดือนถัดไป (MTH)",
};

const FOOTER_NOTE = "เอกสารนี้เป็นการประเมินค่าบริการเบื้องต้น มีผล 15 วันนับจากวันที่ออกเอกสาร";

let seq = 0;
export const newQuoteNodeId = () => `qn-${Date.now().toString(36)}-${(seq += 1)}`;

/* ---------------- html for each node (branding-owned) ---------------- */

const CI_HEADER_HTML = `<div class="q-ci-header">
  <div class="q-brand"><span class="q-logo">H<sup>+</sup> HOTEL PLUS</span><span class="q-tagline">ผู้ช่วยโรงแรมมืออาชีพ บริหารรายได้ให้พลัส</span></div>
  <div class="q-doc-label">ใบประเมินค่าบริการ</div>
</div>`;

const INFO_BLOCK_HTML = `<div class="q-info">
  <div class="q-info-col">
    <p class="q-info-head">{{company.legal_name}}</p>
    <p>{{company.address}}</p>
    <p>โทร {{company.phone}} · {{company.email}}</p>
  </div>
  <div class="q-info-col q-info-col--doc">
    <table class="q-doc-table">
      <tr><td>เลขที่เอกสาร</td><td>{{quote.quote_id}}</td></tr>
      <tr><td>วันที่ออกเอกสาร</td><td>{{quote.issue_date | date_th}}</td></tr>
      <tr><td>เสนอราคาให้</td><td>{{quote.hotel_name}}</td></tr>
    </table>
  </div>
</div>`;

const PACKAGE_CARD_HTML = `<div class="q-pkg-card">
  <p class="q-pkg-name">{{quote.package_name}}</p>
  <p class="q-pkg-desc">{{quote.package_description}}</p>
</div>`;

const FOOTER_HTML = `<div class="q-footer">
  <div class="q-footer-text">
    <p>จัดทำโดย: {{quote.created_by_email}}</p>
    <p>หมายเหตุ: ${FOOTER_NOTE}</p>
  </div>
  <span class="q-page-num">1 / 1</span>
</div>`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const pricingTableHtml = (n: Extract<QuoteNode, { type: "pricing_table" }>) => `<table class="q-table">
  <thead><tr><th>#</th><th>${esc(n.title)}</th><th class="q-num">จำนวน</th></tr></thead>
  <tbody>
    <foreach items="quote.line_items" as="line_item" categories="${FILTER_CATEGORIES[n.filter]}">
      <tr><td>{{loop.index}}</td><td>{{line_item.product_name}}</td><td class="q-num">{{line_item.price | thb_or_percent}}</td></tr>
    </foreach>
  </tbody>
  <tfoot>
    <tr><td colspan="2">รวม${esc(n.title)} (ไม่รวมภาษีมูลค่าเพิ่ม)</td><td class="q-num">{{${n.total_field} | thb}}</td></tr>${
      n.show_commission
        ? `
    <tr><td colspan="2">ค่าคอมมิชชั่นจากยอดขายห้องพัก</td><td class="q-num">{{quote.commission_rate | pct}}</td></tr>`
        : ""
    }
  </tfoot>
</table>`;

export const quoteNodeHtml = (n: QuoteNode): string => {
  switch (n.type) {
    case "ci_header":
      return CI_HEADER_HTML;
    case "info_block":
      return INFO_BLOCK_HTML;
    case "package_card":
      return PACKAGE_CARD_HTML;
    case "pricing_table":
      return pricingTableHtml(n);
    case "footer":
      return FOOTER_HTML;
    case "caption":
      return `<p class="q-caption">${esc(n.text)}</p>`;
  }
};

/* ---------------- serialise / parse ---------------- */

const attr = (s: string, k: string) => new RegExp(`${k}="([^"]*)"`).exec(s)?.[1];

export const serializeQuoteNode = (n: QuoteNode): string => {
  if (n.type === "caption") return `<qnode type="caption" text="${n.text.replace(/"/g, "'")}" />`;
  if (n.type === "pricing_table")
    return `<qnode type="pricing_table" title="${n.title.replace(/"/g, "'")}" filter="${n.filter}" total_field="${n.total_field}" show_commission="${n.show_commission}" />`;
  return `<qnode type="${n.type}" />`;
};

export const serializeQuoteNodes = (nodes: QuoteNode[]) => nodes.map(serializeQuoteNode).join("\n");

const NODE_RE = /<qnode\b([^>]*?)\/>/g;

export const isQuoteNodeBody = (body: string) => /<qnode\b/.test(body);

export function parseQuoteNodes(body: string): QuoteNode[] {
  const out: QuoteNode[] = [];
  let last = 0;
  for (const m of body.matchAll(NODE_RE)) {
    const between = body.slice(last, m.index).trim();
    if (between) out.push({ id: newQuoteNodeId(), type: "caption", text: between.replace(/<[^>]+>/g, "").trim() });
    last = (m.index ?? 0) + m[0].length;
    const raw = m[1] ?? "";
    const type = (attr(raw, "type") ?? "caption") as QuoteNodeType;
    if (type === "pricing_table") {
      out.push({
        id: newQuoteNodeId(),
        type,
        title: attr(raw, "title") ?? "ค่าบริการ",
        filter: (attr(raw, "filter") ?? "first_month") as QuotePricingFilter,
        total_field: attr(raw, "total_field") ?? "quote.first_month_total",
        show_commission: attr(raw, "show_commission") === "true",
      });
    } else if (type === "caption") {
      out.push({ id: newQuoteNodeId(), type, text: attr(raw, "text") ?? "" });
    } else {
      out.push({ id: newQuoteNodeId(), type });
    }
  }
  const tail = body.slice(last).trim();
  if (tail) out.push({ id: newQuoteNodeId(), type: "caption", text: tail.replace(/<[^>]+>/g, "").trim() });
  return out.filter((n) => n.type !== "caption" || n.text.length > 0);
}

/** Expand <qnode/> tags into branded HTML before placeholder resolution. */
export const expandQuoteNodes = (body: string) =>
  isQuoteNodeBody(body) ? parseQuoteNodes(body).map(quoteNodeHtml).join("\n") : body;

export const createQuoteNode = (type: QuoteNodeType): QuoteNode =>
  type === "pricing_table"
    ? {
        id: newQuoteNodeId(),
        type,
        title: "ค่าบริการเดือนแรก",
        filter: "first_month",
        total_field: "quote.first_month_total",
        show_commission: false,
      }
    : type === "caption"
      ? { id: newQuoteNodeId(), type, text: "ข้อความเพิ่มเติม" }
      : { id: newQuoteNodeId(), type };

/* ---------------- default bodies used by the seeds ---------------- */

const defaultNodes = (showCommission: boolean): QuoteNode[] => [
  { id: "n1", type: "ci_header" },
  { id: "n2", type: "info_block" },
  { id: "n3", type: "package_card" },
  {
    id: "n4",
    type: "pricing_table",
    title: "ค่าบริการเดือนแรก",
    filter: "first_month",
    total_field: "quote.first_month_total",
    show_commission: showCommission,
  },
  {
    id: "n5",
    type: "pricing_table",
    title: "ค่าบริการตลอดอายุสัญญา",
    filter: "recurring",
    total_field: "quote.recurring_total",
    show_commission: showCommission,
  },
  { id: "n6", type: "footer" },
];

export const QUOTE_BODY_ORM = serializeQuoteNodes(defaultNodes(true));
export const QUOTE_BODY_MARCOM = serializeQuoteNodes(defaultNodes(false));
