/* Tab R5 (O-18) — Renewal Offer on card ③ การต่อสัญญา — acceptance tests (§8). Values from the spec §6 demo + the v1.4 engine. */
import { describe, expect, mock, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: mock(() => {}) }));
const R2 = await import('../src/lib/renewal-r2');
const D2 = await import('../src/lib/renewal-r2-demo');
const R5 = await import('../src/lib/renewal-r5');
const D5 = await import('../src/lib/renewal-r5-demo');
const ENG = await import('../src/lib/renewalOffer');
const STORE = await import('../src/lib/renewal-store');
const UI = await import('../src/components/ps/renewal-offer-r5');
const { RN5, RN2 } = await import('../src/lib/ps-glossary');
const { DEMO_DAY } = await import('../src/lib/demo-session');

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const item = (id: string) => D5.renewalR5DemoItems().find((i) => i.contract_id === id)!;
const offer = (id: string) => D5.r5DemoOfferById(id)!;
const info = (id: string) => UI.offerInfoFor(item(id), null, true);
const reason = (id: string) => D5.renewalR5DemoReasons().find((r) => r.contract_id === id) ?? null;

describe('§1 old card unmounted', () => {
  test('1 · ข้อเสนอต่อสัญญา not rendered in the tab (flag off), RepricingBox component still exists', async () => {
    const src = readFileSync('src/components/ps/ps-report-tab.tsx', 'utf8');
    expect(src).toContain('const R5_OLD_OFFER_CARD = false as boolean;');
    expect(src).toMatch(/\{R5_OLD_OFFER_CARD && <div/);
    const ex = await import('../src/components/ps/expansion-ui');
    expect(typeof ex.RepricingBox).toBe('function');
  });
});

describe('§2 undecided block', () => {
  STORE.setRenewalDemo(true);
  const cm = () => UI.v14BoardItems([STORE.latestRequestFor('RN-V14-CM')!, STORE.latestRequestFor('RN-V14-BS')!].filter(Boolean));
  const infoOf = (cid: string) => { const i = cm().concat(UI.v14BoardItems([])).find((x) => x.contract_id === cid)!; return UI.offerInfoFor(i, i.card_id ? STORE.latestRequestFor(i.card_id) : null, true); };

  test('2 · collapsed by default with aria-expanded=false; open shows the body', () => {
    const i = infoOf('CT-HTL0415');
    const closed = renderToStaticMarkup(h(UI.OfferBlock, { info: i, open: false, onToggle: () => {} }));
    expect(closed).toContain('aria-expanded="false"'); expect(closed).not.toContain('rn5-body'); expect(text(closed)).toContain(`▾ ${RN5.block.title}`);
    const open = renderToStaticMarkup(h(UI.OfferBlock, { info: i, open: true, onToggle: () => {} }));
    expect(open).toContain('aria-expanded="true"'); expect(text(open)).toContain(`▴ ${RN5.block.title}`);
    expect(RN5.openAll).toBe('▾ เปิดข้อมูลประกอบการต่อสัญญาทุกการ์ด'); expect(RN5.closeAll).toBe('▴ ซ่อนข้อมูลประกอบการต่อสัญญาทุกการ์ด');
  });
  test('3 · every row has its label; labels by name (no counts); AE ✎ chip dashed', () => {
    const html = renderToStaticMarkup(h(UI.OfferBlock, { info: infoOf('CT-HTL0411'), open: true, onToggle: () => {} }));
    const B = RN5.block;
    for (const l of [B.health, B.labels, B.tickets, B.pkg, B.current, B.reco, B.expected]) expect(html).toContain(`<dt>${l}</dt>`);
    expect((html.match(/<dt>/g) ?? []).length).toBe((html.match(/<dd/g) ?? []).length);
    expect(text(html)).toMatch(/▼ รายได้หรือยอดจองไม่ถึงที่คาดหวัง/);
    const ae = renderToStaticMarkup(h(UI.OfferBlock, { info: { ...infoOf('CT-HTL0411'), ctx: { ...infoOf('CT-HTL0411').ctx!, chips: [{ key: 'X', label: 'ลูกค้าบ่น', dir: 'bad', ae: true }] } }, open: true, onToggle: () => {} }));
    expect(ae).toContain('rn5-ae'); expect(text(ae)).toContain('AE ✎ ลูกค้าบ่น');
    expect(readFileSync('src/styles.css', 'utf8')).toMatch(/\.r1-chip\.rn5-ae\{border-style:dashed/);
  });
  test('4 · recommendation values equal computeRenewalOffer output, one card per billing model', () => {
    for (const [cid, model] of [['CT-HTL0412', 'FLAT'], ['CT-HTL0416', 'FIXED_PLUS_COMMISSION'], ['CT-HTL0413', 'COMMISSION_GUARANTEE']] as const) {
      const src = STORE.sourceContractById(cid)!; const ctx = STORE.offerContextForSource(src);
      expect(ctx.offer.model).toBe(model);
      const i = UI.offerInfoFor({ ...UI.v14BoardItems([]).find((x) => x.contract_id === cid)!, stage: 'NOT_STARTED' }, null, true);
      expect(i.reco!.values).toEqual(ctx.offer.values);
      expect(i.reco!.expected_avg).toBe(ctx.offer.expected_avg);
    }
  });
  test('5 · a card with a request shows AE เสนอ + match tag from offer_match; package change shows เปลี่ยน Package', () => {
    const reqCm = STORE.latestRequestFor('RN-V14-CM')!; const reqBs = STORE.latestRequestFor('RN-V14-BS')!;
    const cmHtml = renderToStaticMarkup(h(UI.OfferBlock, { info: infoOf('CT-HTL0411'), open: true, onToggle: () => {} }));
    expect(cmHtml).toContain('rn5-ae-offer'); expect(text(cmHtml)).toContain(RN5.block.aeOffer);
    expect(text(cmHtml)).toContain({ MATCH: 'ตรงคำแนะนำ', ABOVE: 'สูงกว่าที่แนะนำ', BELOW: 'ต่ำกว่าที่แนะนำ' }[reqCm.offer_match!]);
    const bsHtml = renderToStaticMarkup(h(UI.OfferBlock, { info: infoOf('CT-HTL0412'), open: true, onToggle: () => {} }));
    expect(reqBs.old_terms.billing_model).toBe('FLAT'); expect(reqBs.new_terms.billing_model).toBe('FIXED_PLUS_COMMISSION');
    expect(bsHtml).toContain('rn5-switch'); expect(text(bsHtml)).toContain('เปลี่ยน Package'); expect(text(bsHtml)).toContain('฿8,500 + 5.5%');
  });
  test('6 · overdue demo card (Makka) shows ● คงค่าบริการ + ค้างชำระ', () => {
    const html = text(renderToStaticMarkup(h(UI.OfferBlock, { info: infoOf('CT-HTL0415'), open: true, onToggle: () => {} })));
    expect(html).toContain('● คงค่าบริการ'); expect(html).toContain('ค้างชำระ');
  });
  test('days left on undecided cards = computed from the DEMO clock', () => {
    const mk = UI.v14BoardItems([]).find((x) => x.contract_id === 'CT-HTL0415')!;
    expect(DEMO_DAY).toBe('2026-10-28');
    expect(R2.countdown(mk.end, DEMO_DAY).days).toBe(43);
  });
});

describe('§3 decided cards', () => {
  test('§6 demo values come from the engine and match the spec', () => {
    expect(R5.shortReco(offer('CT-ORM-R5-UBON').offer.type, 'FLAT', offer('CT-ORM-R5-UBON').offer.values)).toBe('฿21,600–21,800');
    expect(offer('CT-ORM-R5-UBON').offer.values[0]!.default).toBe(21700);
    expect(R5.shortReco('RAISE', 'FIXED_PLUS_COMMISSION', offer('CT-ORM-R5-HATYAI').offer.values)).toBe('฿6,180–6,300 + 7.5%');
    expect(offer('CT-MAR-R5-LOEI').offer.type).toBe('KEEP');
    expect(R5.shortTerms('FIXED_PLUS_COMMISSION', offer('CT-ORM-R5-UDON').offered)).toBe('฿5,000 + 9%');
    expect(offer('CT-MAR-R5-SIAM').offer.values[0]!.default).toBe(16200);
    expect(offer('CT-MAR-R5-KORAT').offer.type).toBe('LOWER'); expect(offer('CT-MAR-R5-KORAT').offer.values[0]!.default).toBe(21300);
    expect(D5.renewalR5DemoItems().every((i) => i.end >= '2026-10-01' && i.end <= DEMO_DAY)).toBe(true);
  });
  test('7a · four tag rules', () => {
    const tag = (id: string) => R5.decidedTag({ stage: item(id).stage as 'RENEWED', hasSnapshot: true, recoType: offer(id).offer.type, match: offer(id).offer_match, reasons: reason(id) ? [...reason(id)!.primary, reason(id)!.secondary] : null });
    expect(tag('CT-ORM-R5-UBON')).toBe('MATCH'); expect(tag('CT-ORM-R5-UDON')).toBe('MATCH');
    expect(tag('CT-ORM-R5-HATYAI')).toBe('ABOVE');
    expect(tag('CT-MAR-R5-LOEI')).toBe('BELOW');
    expect(tag('CT-MAR-R5-SIAM')).toBe('PRICE_LOST');
    expect(tag('CT-MAR-R5-KORAT')).toBe('OTHER_LOST');
    expect([R5.DECIDED_TAG_TH.MATCH, R5.DECIDED_TAG_TH.ABOVE, R5.DECIDED_TAG_TH.BELOW, R5.DECIDED_TAG_TH.PRICE_LOST]).toEqual(['ต่อตามคำแนะนำ', 'ต่อสูงกว่าคำแนะนำ', 'ต่อต่ำกว่าคำแนะนำ', 'หลุดเพราะค่าบริการ']);
    expect(R5.DECIDED_TAG_TONE.ABOVE).toBe('amber'); expect(R5.DECIDED_TAG_TONE.BELOW).toBe('bad'); expect(R5.DECIDED_TAG_TONE.MATCH).toBe('good');
  });
  test('7b · grey cases: reasons not recorded · recommendation NONE · no snapshot', () => {
    expect(R5.decidedTag({ stage: 'LOST_OR_DECLINED', hasSnapshot: true, recoType: 'RAISE', match: null, reasons: null })).toBe('WAIT_REASON');
    expect(R5.decidedTag({ stage: 'RENEWED', hasSnapshot: true, recoType: 'NONE', match: null, reasons: null })).toBe('KEEP_TERMS');
    expect(R5.DECIDED_TAG_TH.KEEP_TERMS).toBe('ต่อตามเงื่อนไขเดิม'); expect(R5.DECIDED_TAG_TH.WAIT_REASON).toBe('รอบันทึกเหตุผล');
    const old = D2.renewalR2DemoItems().find((i) => i.contract_id === 'CT-ORM-Q-ORM-0391')!; // Phuket Sands, no v1.4 snapshot
    const html = text(renderToStaticMarkup(h(UI.OfferResult, { i: old, info: UI.offerInfoFor(old, null, true), rec: null })));
    expect(html).toContain('ไม่มีข้อมูลคำแนะนำ'); expect(html).not.toContain(RN5.result.result);
  });
  test('7c · group-1 reason chip orange with 1 px border; others keep main red / secondary amber', () => {
    expect(UI.reasonChipCls('PRICE_HIGH', true)).toContain('rn5-g1');
    expect(UI.reasonChipCls('PROMISE_BROKEN', true)).toContain('is-bad');
    expect(UI.reasonChipCls('POLICY_CHANGE', false)).toContain('is-amber');
    expect(readFileSync('src/styles.css', 'utf8')).toMatch(/\.r1-chip\.rn5-g1\{[^}]*border:1px solid/);
  });
  test('result lines: package switch text + average Δ (signed only)', () => {
    const u = text(renderToStaticMarkup(h(UI.OfferResult, { i: item('CT-ORM-R5-UDON'), info: info('CT-ORM-R5-UDON'), rec: null })));
    expect(u).toContain('เปลี่ยน Package · Commission + Guarantee fee → Monthly fee + Commission · ฿5,000 + 9%');
    const ub = text(renderToStaticMarkup(h(UI.OfferResult, { i: item('CT-ORM-R5-UBON'), info: info('CT-ORM-R5-UBON'), rec: null })));
    expect(ub).toContain('฿20,000 → ฿21,700 +฿1,700 (+8.5%)');
    const si = text(renderToStaticMarkup(h(UI.OfferResult, { i: item('CT-MAR-R5-SIAM'), info: info('CT-MAR-R5-SIAM'), rec: reason('CT-MAR-R5-SIAM') })));
    expect(si).toContain('฿15,000 → ฿16,200'); expect(si).not.toContain('+฿1,200');
  });
});

describe('§4 highlight chips', () => {
  const list = D5.renewalR5DemoItems();
  const typeOf = (i: { contract_id: string }) => D5.r5DemoOfferById(i.contract_id)?.offer.type ?? null;
  test('8 · counts per period (decided cards use their snapshot type) · multi-select · AND with search · non-matching grey not hidden', () => {
    const q4 = R2.periodOf('quarter', DEMO_DAY);
    expect(R5.offerChipCounts(list.filter((i) => R2.inPeriod(i, q4)), typeOf)).toEqual({ RAISE: 3, KEEP: 2, LOWER: 1 });
    expect(R5.offerChipCounts(list.filter((i) => R2.inPeriod(i, R2.periodOf('quarter', '2026-07-01'))), typeOf)).toEqual({ RAISE: 0, KEEP: 0, LOWER: 0 });
    const sel = new Set<'RAISE' | 'KEEP' | 'LOWER'>(['RAISE', 'LOWER']);
    expect(list.filter((i) => R5.offerHit(sel, typeOf(i))).map((i) => i.contract_id).sort()).toEqual(['CT-MAR-R5-KORAT', 'CT-MAR-R5-SIAM', 'CT-ORM-R5-HATYAI', 'CT-ORM-R5-UBON']);
    const hit = (i: (typeof list)[number]) => R2.highlightHit(i, { ...R2.NO_HIGHLIGHT, q: 'siam' }) && R5.offerHit(sel, typeOf(i));
    expect(list.filter(hit).map((i) => i.contract_id)).toEqual(['CT-MAR-R5-SIAM']);
    expect(R5.offerHit(new Set(), null)).toBe(true); expect(R5.offerHit(sel, 'NONE')).toBe(false);
    // board keeps every card (sorted, never filtered)
    expect(R2.boardSort('RENEWED', list.filter((i) => i.stage === 'RENEWED'), () => true, hit).length).toBe(4);
  });
  test('KPI / AE table rules untouched (pure windowStats over the same items)', () => {
    const base = D2.renewalR2DemoItems(); const q4 = R2.periodOf('quarter', DEMO_DAY);
    const before = R2.windowStats(base, q4, DEMO_DAY, DEMO_DAY);
    const after = R2.windowStats([...base, ...list], q4, DEMO_DAY, DEMO_DAY);
    expect(after.total - before.total).toBe(6); expect(after.renewed - before.renewed).toBe(4); expect(after.lost - before.lost).toBe(2);
  });
});

describe('§5 / §9 / §10 help + guards', () => {
  test('tour step count unchanged; highlight step mentions ข้อเสนอ chips; chip ⓘ text', () => {
    expect(RN2.tour.length).toBe(8);
    expect(RN2.tour.find((s) => s.target === 'rn2-highlight')!.text).toContain('ข้อเสนอ');
    expect(RN5.chipInfo).toBe('คำแนะนำจากสูตรตายตัว ไม่ใช่ AI · คำนวณรายวัน และใช้ค่าที่บันทึกไว้ตอน AE กดต่อสัญญา');
    expect(RN2.info).toContain('ตัวเลขสรุปข้อเสนออยู่ใน The Office Dashboard');
  });
  test('9 · no offer summary/chart/table in PS Dashboard; no local formula in R5 files', () => {
    const files = ['src/components/ps/renewal-offer-r5.tsx', 'src/lib/renewal-r5.ts'].map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(files).not.toMatch(/round100|roundHalfPoint|band_min_pct\s*[*+]/);
    expect(files).not.toMatch(/ข้อเสนอที่ส่งทั้งหมด|อัตราต่อสัญญาตามข้อเสนอ|<table/);
    expect(typeof ENG.computeRenewalOffer).toBe('function'); expect(typeof ENG.matchOffer).toBe('function');
  });
});
