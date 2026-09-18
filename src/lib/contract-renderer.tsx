/* PS App v2.1 — shared contract renderer
 * Single source of truth for A4 paper simulation used by:
 *   PS-2 (quote editor) · PS-3 (contract editor) · PS-6 (block group editor) · PS-10 (full preview)
 * Wave 4 (AC App Live Link) imports the same module so admin preview, wizard
 * preview and the customer-facing contract never drift.
 *
 * Note: pagination + PDF are produced in the browser (CSS page boxes + print),
 * not Puppeteer/Paged.js — the hosting runtime has no headless Chrome. */
import type { ReactNode } from "react";

import heroMarcom from "@/assets/cover-hero-marcom.jpg";
import heroOrm from "@/assets/cover-hero-orm.jpg";
import heroPp from "@/assets/cover-hero-pp.jpg";
import heroProd from "@/assets/cover-hero-prod.jpg";
import { SERVICE_LINE_LABEL, type PreviewServiceLine } from "@/lib/template-preview-sample-data";

export const HERO_BY_SERVICE_LINE: Record<PreviewServiceLine, string> = {
  ORM: heroOrm,
  MARCOM: heroMarcom,
  PROD: heroProd,
  PP: heroPp,
};

export const COMPANY_ADDRESS_LINE = "92/5 SATHORN THANI BUILDING 2 NORTH SATHORN SILOM BANGRAK 10500";
export const COMPANY_CONTACT_LINE = "WWW.HOTELPLUS.ASIA · 082-8989-369 · INFO@HOTELPLUS.ASIA";

/** marker inserted by the "Signature blocks" panel — atomic, labels not editable */
export const SIGNATURE_MARKER = "<SignatureBlock />";
export const SIGNATURE_RE = /<SignatureBlock\s*\/?>/g;

/* ---------------- placeholder resolution ---------------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Replaces {{field | filter}} with a coloured pill (filled = blue, empty = yellow). */
export function resolvePlaceholders(
  content: string,
  data: Record<string, string>,
  opts: { raw?: boolean; pills?: boolean } = {},
): string {
  return content.replace(/\{\{\s*([^}|]+?)\s*(\|\s*[a-z_:]+\s*)?\}\}/g, (all, path: string) => {
    const key = path.trim();
    if (opts.raw) return `<span class="ph-pill ph-pill--raw">${esc(all)}</span>`;
    if (key.startsWith("loop.")) return key === "loop.index" ? "1" : "4";
    const value = data[key];
    if (!opts.pills) return value ?? `⟨${esc(key)}⟩`;
    return value
      ? `<span class="ph-pill ph-pill--filled">${esc(value)}</span>`
      : `<span class="ph-pill ph-pill--empty" title="${esc(key)}">⟨${esc(key)}⟩</span>`;
  });
}

/* ---------------- CI components ---------------- */

export function CIHeader({ serviceLine, greyed }: { serviceLine: PreviewServiceLine; greyed?: boolean }) {
  return (
    <div className="ci-bar ci-bar--header" style={greyed ? { opacity: 0.5 } : undefined}>
      <span className="ci-logo">
        H<sup>+</sup> <span className="ci-logo-word">HOTEL PLUS</span>
      </span>
      <span className="ci-header-title">{SERVICE_LINE_LABEL[serviceLine]}</span>
    </div>
  );
}

export function CIFooter({
  pageNum,
  totalPages,
  greyed,
}: {
  pageNum?: number;
  totalPages?: number;
  greyed?: boolean;
}) {
  return (
    <div className="ci-bar ci-bar--footer" style={greyed ? { opacity: 0.5 } : undefined}>
      <div className="ci-footer-text">
        <p>{COMPANY_ADDRESS_LINE}</p>
        <p>{COMPANY_CONTACT_LINE}</p>
      </div>
      {pageNum && totalPages ? (
        <span className="ci-page-num">
          หน้า {pageNum}/{totalPages}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------- cover page (auto-generated · read-only) ---------------- */

export function CoverPage({
  serviceLine,
  contractCode,
  hotelName,
}: {
  serviceLine: PreviewServiceLine;
  contractCode: string;
  hotelName: string;
}) {
  return (
    <section className="a4-page a4-cover" aria-label="Cover page (auto-generated)">
      <p className="a4-cover-code">{contractCode}</p>
      <img
        src={HERO_BY_SERVICE_LINE[serviceLine]}
        alt=""
        loading="lazy"
        width={1200}
        height={720}
        className="a4-cover-hero"
      />
      <div className="a4-cover-body">
        <span className="a4-cover-logo">
          H<sup>+</sup> <span>HOTEL PLUS</span>
        </span>
        <p className="a4-cover-line">{SERVICE_LINE_LABEL[serviceLine]}</p>
        <h2 className="a4-cover-hotel">{hotelName}</h2>
        <hr className="a4-cover-rule" />
        <p className="a4-cover-terms">TERMS AND AGREEMENTS CONTRACT</p>
      </div>
      <span className="a4-readonly-badge">auto-generated · แก้ไขไม่ได้</span>
    </section>
  );
}

/* ---------------- signature block node ---------------- */

export function SignatureBlock({
  customerSigner,
  hpSignatory,
  signedDate,
}: {
  customerSigner: string;
  hpSignatory: string;
  signedDate: string | null;
}) {
  const col = (label: string, name: string) => (
    <div className="sig-col">
      <p className="sig-line">ลงชื่อ</p>
      <p className="sig-role">{label}</p>
      <p className="sig-name">( {name} )</p>
      <p className="sig-date">วันที่ {signedDate ?? "…………………"}</p>
    </div>
  );
  return (
    <div className="sig-block" data-node="signature_block">
      {col("เจ้าของโครงการ", customerSigner)}
      {col("ฝ่ายบริหารจัดการ", hpSignatory)}
    </div>
  );
}

export function signatureBlockHtml(customerSigner: string, hpSignatory: string, signedDate: string | null) {
  const col = (role: string, name: string) =>
    `<div class="sig-col"><p class="sig-line">ลงชื่อ</p><p class="sig-role">${esc(role)}</p><p class="sig-name">( ${esc(
      name,
    )} )</p><p class="sig-date">วันที่ ${esc(signedDate ?? "…………………")}</p></div>`;
  return `<div class="sig-block" data-node="signature_block">${col("เจ้าของโครงการ", customerSigner)}${col(
    "ฝ่ายบริหารจัดการ",
    hpSignatory,
  )}</div>`;
}

/* ---------------- quote pricing rows (v2.1 Path A · Phase 4) ---------------- */

const thb = (n: number) => n.toLocaleString("en-US");

/** §4.5 `thb_or_percent` — 4 cases: percent · free · one-time setup · baht. */
export function thbOrPercent(item: QuoteLineItem): string {
  if (item.unit === "%") return `${item.price}%`;
  if (item.price === 0) return "FREE";
  if (item.is_setup) return `One Time Setup ฿${thb(item.price)}`;
  return `฿${thb(item.price)}`;
}

const LOOP_RE = /<foreach\s+items="([^"]+)"\s+as="([^"]+)"(?:\s+categories="([^"]+)")?\s*>([\s\S]*?)<\/foreach>/g;

/** Expands `<foreach items="quote.line_items" as="line_item" categories="MTH,SETUP">…</foreach>`. */
export function expandLoops(content: string, items: QuoteLineItem[]): string {
  return content.replace(LOOP_RE, (_all, _items: string, alias: string, categories: string | undefined, inner: string) => {
    const wanted = categories?.split(",").map((c) => c.trim());
    const rows = wanted ? items.filter((i) => wanted.includes(i.category)) : items;
    return rows
      .map((row, idx) =>
        inner
          .replace(/\{\{\s*loop\.index\s*\}\}/g, String(idx + 1))
          .replace(new RegExp(`\\{\\{\\s*${alias}\\.price\\s*(\\|[^}]*)?\\}\\}`, "g"), thbOrPercent(row))
          .replace(new RegExp(`\\{\\{\\s*${alias}\\.product_name\\s*(\\|[^}]*)?\\}\\}`, "g"), esc(row.product_name)),
      )
      .join("");
  });
}

/** Full body render: loops + signature nodes + placeholder pills. */
export function renderBody(
  content: string,
  data: Record<string, string>,
  opts: { raw?: boolean; pills?: boolean; lineItems?: QuoteLineItem[] } = {},
): string {
  const withLoops = opts.raw ? content : expandLoops(content, opts.lineItems ?? []);
  const withSig = withLoops.replace(SIGNATURE_RE, () =>
    signatureBlockHtml(
      data["customer.signer_name"] ?? "…………………",
      data["hotelplus.authorized_signatory"] ?? "…………………",
      opts.raw ? null : (data["contract.signed_date"] ?? null),
    ),
  );
  return resolvePlaceholders(withSig, data, opts);
}

/* ---------------- A4 canvas ---------------- */

export function A4Canvas({
  showCover = true,
  showCIHeaderFooter = true,
  greyedCI = false,
  serviceLine,
  contractCode = "—",
  hotelName = "—",
  children,
}: {
  showCover?: boolean;
  showCIHeaderFooter?: boolean;
  greyedCI?: boolean;
  serviceLine: PreviewServiceLine;
  contractCode?: string;
  hotelName?: string;
  children: ReactNode;
}) {
  return (
    <div className="a4-canvas">
      {showCover && <CoverPage serviceLine={serviceLine} contractCode={contractCode} hotelName={hotelName} />}
      <section className="a4-page a4-page--flow">
        {showCIHeaderFooter && <CIHeader serviceLine={serviceLine} greyed={greyedCI} />}
        <div className="a4-body">{children}</div>
        {showCIHeaderFooter && <CIFooter greyed={greyedCI} />}
      </section>
    </div>
  );
}

/* ---------------- pagination (PS-10) ---------------- */

export type RenderedPage = { kind: "cover" | "body"; label: string; html?: string };

/** Splits rendered blocks into A4 pages using a character-budget heuristic. */
export function paginateA4(
  blocks: { title: string; html: string }[],
  opts: { showCover: boolean; charsPerPage?: number },
): RenderedPage[] {
  const budget = opts.charsPerPage ?? 1800;
  const pages: RenderedPage[] = [];
  if (opts.showCover) pages.push({ kind: "cover", label: "Cover" });

  let buf = "";
  let first = "";
  const flush = () => {
    if (!buf) return;
    pages.push({ kind: "body", label: first, html: buf });
    buf = "";
    first = "";
  };
  for (const b of blocks) {
    const plain = b.html.replace(/<[^>]+>/g, "");
    if (buf && buf.replace(/<[^>]+>/g, "").length + plain.length > budget) flush();
    if (!first) first = b.title;
    buf += `<section class="a4-block"><h3 class="a4-block-title">${esc(b.title)}</h3>${b.html}</section>`;
  }
  flush();
  if (pages.length === (opts.showCover ? 1 : 0)) pages.push({ kind: "body", label: "Body", html: "" });
  return pages;
}
