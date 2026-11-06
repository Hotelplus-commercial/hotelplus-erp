# RULES_TAB_R5_Q58 — moved word for word from src/components/ps/AGENTS.md

## Tab R5 · สัญญา & ราคา · Renewal Offer on card ③ (O-18, 2026-11-05)
- §1 RP127: card ข้อเสนอต่อสัญญา is unmounted from this tab (`R5_OLD_OFFER_CARD` flag); RepricingBox and v_ps_repricing stay in code.
- §2 RP144: undecided contract cards (ยังไม่เริ่ม · กำลังดำเนินการ · ส่ง link แล้ว) carry the collapsed block ข้อมูลประกอบการต่อสัญญา below the SLA rows (src/components/ps/renewal-offer-r5.tsx). Values come only from the v1.4 engine via renewal-offer-source (fresh daily) or, once a request exists, its reco_snapshot / new_terms / offer_expected_avg / offer_match. Package = the contract's billing model when present, else new_terms. The block never changes counts, sort or stage. Why: one engine, no second formula.
- §3 RP145 / RP143: decided cards show ผลข้อเสนอ lines; tag rules are pure `decidedTag()` in src/lib/renewal-r5.ts (group-1 reason = หลุดเพราะค่าบริการ; group-1 reason chips orange with border). No v1.4 snapshot → only ข้อเสนอที่ส่ง + ไม่มีข้อมูลคำแนะนำ, no tag.
- §4 RP146: highlight bar offer chips ขึ้น · คง · ลดค่าบริการ (multi-select, AND with AE / search, counts per period, decided = snapshot type) + expand / collapse all; no chip for commission-pending / no-recommendation; KPIs, AE table, urgent tiles and reasons unaffected.
- In DEMO the card switches the renewal store to its in-memory DEMO state (same shared DEMO as AE Workspace) so v1.4 demo requests show; R5 demo additions live in src/lib/renewal-r5-demo.ts (engine-built, never stored).
- Offer summaries (offers sent, renewal %, lost because of price, ① – ⑤) live in The Office Dashboard (RP153) — never add them to PS Dashboard.
- Open items — do not implement on your own: ⏰ O-18 Value Added · O-27 (per R5 handoff) · O-19 · Q58 · Q59 · S10 · S11 · S12 · S31 · S32 · O-13 · O-21.
- Open item O-27 "ลูกค้าค้างชำระที่สัญญาอื่น" — do not build, waiting for PM decision: should an overdue bill on ANOTHER contract of the same hotel (e.g. Marcom overdue while ORM is up for renewal) also force this contract's recommendation to "คงค่าบริการ"? Current v1.4 behaviour (keep it): only an overdue bill on THIS contract forces "คงค่าบริการ"; another contract's overdue bill shows a yellow label only.

## Q58 · past-due contracts with no recorded outcome (closed 2026-11-05, Contract Renewal v1.4.1)
- Decisions: (1) past term end with no recorded outcome leaves “ใช้งาน” the day after end_date; (2) churn counts only when ไม่ต่อ / ยกเลิกก่อนกำหนด is recorded; (3) AC stops billing when the contract is not active, the service is closed, or the contract lapsed past its end date (runDailyBilling() already skips these — no guard added); (4) a late renewal starts old end + 1, AC back-bills the gap by hand (the engine never back-bills).
- States via contractStateOn(): ACTIVE · LAPSED_PENDING (ขาดอายุ รอผล) · ENDED_OUTCOME (หลุด) · RENEWED · UPCOMING. Header col 3 “ใช้งาน”, Active Portfolio, card ① levels and card ⑦ rows count ACTIVE only; header col 3 shows red `ขาดอายุ รอผล {n}` (→ สัญญา & ราคา renewal card, tile เลยกำหนด); col 4 “หลุด” unchanged.
- Card ①: grey down bar `ขาดอายุ รอผล` per month of term end; start + in − out − lapsed = end; recording ไม่ต่อ moves it to หลุด, a renewal removes it. Tab R2 past-due banner per RN49; past-due stays out of the rate base.
- Normal mode applies the lapsed rule only to header rows whose contract_id matches the main contract store (that contract's end date); unmatched rows keep the old behaviour and, in testing mode, show grey `ตรวจวันสิ้นสุดไม่ได้ {n} สัญญา (ไม่มีในคลังสัญญาหลัก)`. Never guess an end date.
- Open item: Header active rows must carry contract end_date (or contract_id) so Q58 applies to every contract — portal requirement.
- Open item: runDailyBilling() bills Commission + Guarantee contracts on commission only (no max(commission, guarantee)) — AC notice shown; engine change waits for an AC patch.

- O-26 closed (6 Nov 2026): package change at renewal → RULES_TAB_R2.md PK1–PK14. RP134 hint text = `ทางเลือก: ORM Lite ฿3,900 + 5% (ขั้นต่ำ 3 OTA)` (RO.hint), shown also in the NONE recommendation box.
