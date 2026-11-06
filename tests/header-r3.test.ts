import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { channelOfSku, headerContractJoin, marcomChannelsAsOf } from "@/lib/header-contract-join";
import { HEADER_MARCOM_DEMO_OVERLAY } from "@/lib/header-marcom-overlay-demo";
import { headerDemoPortfolio } from "@/lib/ps-header-r2-demo";
import { tabR1HeaderPortfolio } from "@/lib/contract-tab-r1-demo";
import { ormAsOf, type PortfolioContract } from "@/lib/ps-header-r2";
import { setRenewalDemo } from "@/lib/renewal-store";
import { mainContracts } from "@/lib/main-contract-store";
import { PS_TERM } from "@/lib/ps-glossary";

const demoContracts = (): PortfolioContract[] =>
  [...headerDemoPortfolio().contracts, ...tabR1HeaderPortfolio().contracts].map((c) => (HEADER_MARCOM_DEMO_OVERLAY[c.contract_id] ? { ...c, lines: HEADER_MARCOM_DEMO_OVERLAY[c.contract_id] } : c));

describe("Header R3", () => {
  it("maps SKUs to channels (Google = GMB, KOL travel = TikTok, setup never counted)", () => {
    for (const s of ["MARCOM-MTH-META", "MARCOM-MTH-META-LITE-CONTENT", "MARCOM-MTH-META-LITE-ADS", "MARCOM-ADDON-META-LITE-CONTENT4"]) expect(channelOfSku(s)).toBe("Meta");
    for (const s of ["MARCOM-MTH-TIKTOK", "MARCOM-MTH-TIKTOK-PRO", "MARCOM-MTH-TIKTOK-LITE", "MARCOM-ADDON-TIKTOK-KOL2", "MARCOM-ADDON-KOL-TRAVEL"]) expect(channelOfSku(s)).toBe("TikTok");
    expect(channelOfSku("MARCOM-MTH-GMB")).toBe("Google");
    for (const s of ["MARCOM-SETUP-SOCIAL", "MARCOM-SETUP-META", "MARCOM-SETUP-TIKTOK", "MARCOM-SETUP-GMB"]) expect(channelOfSku(s)).toBe("SETUP");
    expect(channelOfSku("MARCOM-MTH-XYZ")).toBeNull();
  });

  it("joins by contract_id, else hotel + service, never hotel alone", () => {
    const store = [
      { contract_id: "C1", hotel_id: "H1", start_date: "2026-01-01", duration_months: 12, lines: [{ sku_snapshot: "MARCOM-MTH-GMB", unit_price: 5000, billing: "monthly" }] },
      { contract_id: "C2", hotel_id: "H2", start_date: "2026-01-01", duration_months: 12, lines: [{ sku_snapshot: "ORM-MTH-FULL", unit_price: 9000, billing: "monthly" }] },
    ];
    const [a, b, c] = headerContractJoin([{ contract_id: "C1", hotel_id: "X", service: "Marcom" }, { hotel_id: "H2", service: "ORM" }, { hotel_id: "H2", service: "Marcom" }], "2026-10-28", store);
    expect(a!.match).toBe("ID"); expect(a!.end_date).toBe("2026-12-31"); expect(a!.lines[0]!.unit_price).toBe(5000);
    expect(b!.match).toBe("HOTEL_SERVICE");
    expect(c!.match).toBe("NONE");
  });

  it("DEMO: every header demo contract is in the DEMO main contract store (100%)", () => {
    setRenewalDemo(true);
    const ids = new Set(mainContracts().map((c) => c.contract_id));
    const rows = demoContracts();
    expect(rows.filter((r) => ids.has(r.contract_id)).length).toBe(rows.length);
    setRenewalDemo(false);
  });

  it("DEMO Marcom channel cards on 28 Oct 2026", () => {
    const r = marcomChannelsAsOf(demoContracts(), "2026-10-28");
    expect(r.Meta).toEqual({ n: 4, value: 23250 });
    expect(r.TikTok).toEqual({ n: 2, value: 20000 });
    expect(r.Google).toEqual({ n: 2, value: 5500 });
    expect(r.unspecified).toBe(0);
  });

  it("2-channel contract counts once per channel; renewal price change drives the fee chip", () => {
    const one = demoContracts().filter((c) => c.contract_id === "R2-M2");
    const r = marcomChannelsAsOf(one, "2026-10-28");
    expect(r.Meta.n + r.Google.n).toBe(2);
    const m3 = demoContracts().filter((c) => c.contract_id === "R2-M3");
    expect(marcomChannelsAsOf(m3, "2026-10-28").Meta.value).toBe(20000);
    expect(marcomChannelsAsOf(m3, "2026-09-28").Meta.value).toBe(18000);
  });

  it("setup / one-time lines never count", () => {
    const c: PortfolioContract = { service: "Marcom", contract_id: "X", hotel_id: "H", start: "2026-01-01", end: null, ae: null, orm: null, marcom: null, sku: {},
      lines: [{ sku: "MARCOM-SETUP-GMB", unit_price: 9999, billing: "monthly", from: "2026-01-01", to: null }, { sku: "MARCOM-MTH-GMB", unit_price: 4000, billing: "one_time", from: "2026-01-01", to: null }] };
    const r = marcomChannelsAsOf([c], "2026-10-28");
    expect(r.Google.n).toBe(0); expect(r.unspecified).toBe(1);
  });

  it("ORM cards unchanged by the overlay", () => {
    const base = [...headerDemoPortfolio().contracts, ...tabR1HeaderPortfolio().contracts];
    const prices = [...headerDemoPortfolio().prices, ...tabR1HeaderPortfolio().prices];
    expect(ormAsOf(demoContracts(), prices, "2026-10-28")).toEqual(ormAsOf(base, prices, "2026-10-28"));
  });

  it("labels show no raw SKU codes; no hard-coded DEMO dates on PS tabs", () => {
    expect(PS_TERM.channelInfo("Meta")).not.toMatch(/MARCOM-/);
    for (const f of readdirSync("src/components/ps").filter((n) => n.endsWith(".tsx"))) {
      const s = readFileSync(`src/components/ps/${f}`, "utf8");
      expect(s, f).not.toMatch(/DEMO · \d{1,2} (ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|Oct|Sep) 20\d\d/);
    }
  });
});
