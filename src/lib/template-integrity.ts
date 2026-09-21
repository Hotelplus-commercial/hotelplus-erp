/* PS App v2.3 · Template Integrity Patch helpers
 * Scope: ORM Lite SKU canonicalization + hotel address placeholder repair. */

export const CANONICAL_ORM_LITE_SKU = "ORM-MTH-LITE";

export const HOTEL_ADDRESS_COMPONENT_FIELDS = [
  "hotel.address_number",
  "hotel.street",
  "hotel.subdistrict",
  "hotel.district",
  "hotel.province",
  "hotel.postal_code",
] as const;

export const isPhantomOrmLiteSku = (sku: string) => /^ORM-MTH-LITE-[A-Z0-9_-]+$/i.test(sku);

export const canonicalSkuCode = (sku: string) =>
  isPhantomOrmLiteSku(sku) || sku === "ORM-MTH-FULL-LITE" ? CANONICAL_ORM_LITE_SKU : sku;

const addressFieldSource = "hotel\\.(?:address_number|street|subdistrict|district|province|postal_code)";
const addressTokenSource = `(?:⟨${addressFieldSource}⟩|<${addressFieldSource}>|\\{${addressFieldSource}\\}|\\{\\{\\s*${addressFieldSource}\\s*\\}\\})`;
const addressGroupRe = new RegExp(`${addressTokenSource}(?:(?:\\s|,|，|、|·|-|/|&nbsp;|<br\\s*\\/?\\s*>)+${addressTokenSource})+`, "g");
const addressTokenRe = new RegExp(addressTokenSource, "g");
const fieldNameRe = new RegExp(addressFieldSource);

const badLiteralPatterns = [
  { kind: "unicode_angle", re: /⟨([a-z]+\.[a-z_]+)⟩/g },
  { kind: "ascii_angle", re: /<([a-z]+\.[a-z_]+)>/g },
  { kind: "single_brace", re: /(^|[^\{])\{([a-z]+\.[a-z_]+)\}(?!\})/g },
] as const;

export type PlaceholderRepairResult = {
  content: string;
  replacements: number;
  manualReviewFields: string[];
};

export type BadPlaceholderLiteral = {
  kind: string;
  field: string;
  match: string;
  index: number;
};

export function repairHotelAddressText(content: string): PlaceholderRepairResult {
  let replacements = 0;
  const fixed = content.replace(addressGroupRe, () => {
    replacements += 1;
    return "{{hotel.address_full}}";
  });
  const manualReviewFields = [...fixed.matchAll(addressTokenRe)]
    .map((m) => fieldNameRe.exec(m[0])?.[0])
    .filter((field): field is string => Boolean(field));
  return { content: fixed, replacements, manualReviewFields: [...new Set(manualReviewFields)] };
}

export function findBadPlaceholderLiterals(content: string): BadPlaceholderLiteral[] {
  return badLiteralPatterns.flatMap(({ kind, re }) => {
    re.lastIndex = 0;
    return [...content.matchAll(re)].map((m) => ({
      kind,
      field: m[2] ?? m[1] ?? "unknown",
      match: m[0].trim(),
      index: m.index ?? 0,
    }));
  });
}

export function computeHotelAddressFull(data: Record<string, string | undefined>): string {
  const explicit = data["hotel.address_full"]?.trim();
  if (explicit) return explicit;
  const parts = HOTEL_ADDRESS_COMPONENT_FIELDS.map((field) => data[field]?.trim()).filter((value): value is string => Boolean(value));
  if (parts.length) return parts.join(" ").replace(/\s+/g, " ").trim();
  return data["hotel.address"]?.trim() ?? "";
}

export function withComputedHotelAddress(data: Record<string, string>): Record<string, string> {
  return { ...data, "hotel.address_full": computeHotelAddressFull(data) };
}