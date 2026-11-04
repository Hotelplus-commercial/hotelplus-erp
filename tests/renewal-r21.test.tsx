/* R2.1 UAT fix — acceptance tests (§8). Values come from the patch text and the R2 demo additions. */
import { describe, expect, mock, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const stage = mock((_k: string, _v: unknown) => {});
mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: stage }));
const mem: Record<string, string> = {};
(globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const store: Record<string, string> = {};
(globalThis as any).sessionStorage ??= { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };

const S = await import('../src/lib/renewal-store');
const SC = await import('../src/lib/renewal-scan');
const D = await import('../src/lib/renewal-r2-demo');
const G = await import('../src/lib/ps-glossary');
const TA = await import('../src/lib/renewal-test-actor');
const RS = await import('../src/lib/renewal-reasons');
const { CLOUD_DOC_KEYS } = await import('../src/lib/cloud-sync-keys');
const { RnCard, RenewalCardR2 } = await import('../src/components/ps/renewal-card-r2');
const { PsRenewalProvider } = await import('../src/lib/ps-renewal');
const { tabR1Demo } = await import('../src/lib/contract-tab-r1-demo');
import type { Contract } from '../src/lib/crm-types';

const today = D.RENEWAL_R2_DEMO_NOW;
const cardFor = (cid: string) => SC.newCardFrom(D.renewalR2DemoContract(cid)!, 'AE_EARLY', today, 'AE001-Nont');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('UF1 · ต่อสัญญา opens the Wizard by contract', () => {
  test('1 · R2-O4 (ลานนา เฮอริเทจ) → request on R2-O4 with its end date; no “ไม่พบสัญญา”', () => {
    S.setRenewalDemo(true);
    const card = cardFor('R2-O4');
    expect(card.contract_id).toBe('R2-O4');
    const o = S.startRenewal(card);
    expect(o.ok).toBe(true);
    if (o.ok) { expect(o.req.source_contract_id).toBe('R2-O4'); expect(o.req.old_terms.end_date).toBe('2026-12-15'); expect(o.req.new_terms.start_date).toBe('2026-12-16'); }
    const src = S.sourceContractById('R2-O4');
    expect(src?.demo_fallback).toBe(true);
    expect(S.wizardCardFor([card], 'R2-O4', src)?.id).toBe(card.id);
    S.setRenewalDemo(false);
  });
  test('2 · Marcom CT-MAR-Q-MAR-0415 and a simulate-120 contract both open', () => {
    S.setRenewalDemo(true);
    const m = S.startRenewal(cardFor('CT-MAR-Q-MAR-0415'));
    expect(m.ok && m.req.source_contract_id).toBe('CT-MAR-Q-MAR-0415');
    const sim = D.renewalR2Sim(120, today).items.find((i) => i.stage === 'NOT_STARTED')!;
    const simCard = SC.newCardFrom({ contract_id: sim.contract_id, hotel_id: sim.hotel_id, hotel_name: sim.hotel_name, service: sim.service, end: sim.end, ae: sim.ae }, 'AE_EARLY', today, 'AE001-Nont');
    const o = S.startRenewal(simCard);
    expect(o.ok && o.req.source_contract_id).toBe(sim.contract_id);
    S.setRenewalDemo(false);
    expect(S.sourceContractById(sim.contract_id)).toBeNull(); // memory only: gone when DEMO is off
  });
  test('3 · hotel with ORM + Marcom: the Marcom card opens the Marcom contract, never hotel alone', () => {
    const mk = (id: string, pkg: string): import('../src/lib/renewal-store').SourceContract => ({ contract_id: id, hotel_id: 'H1', customer_id: 'C', legal_entity: 'L', signatory: 'S', kyc_docs: [], terms: { fee_amount: 10000, commission_pct: 0, term_months: 12, package: pkg, start_date: '2026-01-01', end_date: '2026-12-31' } });
    const main = [mk('CT-ORM-1', 'ORM Full'), mk('CT-MAR-1', 'Marcom')];
    const r = S.resolveSourceIn({ id: 'RN-X', hotelId: 'H1', contractEnd: '31 Dec 2026', service: 'Marcom' }, { main, renewal: [] }, '2026-10-28');
    expect(r.ok && r.contract.contract_id).toBe('CT-MAR-1');
    const none = S.resolveSourceIn({ id: 'RN-X', hotelId: 'H1', contractEnd: '31 Dec 2026' }, { main, renewal: [] }, '2026-10-28');
    expect(none.ok).toBe(false);
    // one main-store contract holding both services: the card's service picks the lines
    const crm = { contract_id: 'C-1', hotel_id: 'H2', customer_snapshot: { customer_id: 'CUS', legal_name: 'บริษัท', signer_name: 'คุณ', type: 'company', tax_id: '', address: '', contact_phone: '', contact_email: '', hotel_name: '' }, lines: [
      { line_id: '1', sku_snapshot: 'ORM-MTH-FULL', name_snapshot: 'ORM Full Service', package_snapshot: null, billing: 'monthly', unit_price: 16000, commission_rate: 0.03, quantity: 1 },
      { line_id: '2', sku_snapshot: 'MC-CONTENT', name_snapshot: 'Marcom Content', package_snapshot: null, billing: 'monthly', unit_price: 9000, commission_rate: null, quantity: 1 },
    ], start_date: '2026-01-01', duration_months: 12, documents: [] } as unknown as Contract;
    const both = S.sourcesFromMain([crm]);
    const mr = S.resolveSourceIn({ id: 'RN-C-1', hotelId: 'H2', contract_id: 'C-1', service: 'Marcom' }, { main: both, renewal: [] }, '2026-10-28');
    expect(mr.ok && mr.contract.terms.fee_amount).toBe(9000);
    const orm = S.resolveSourceIn({ id: 'RN-C-1', hotelId: 'H2', contract_id: 'C-1', service: 'ORM' }, { main: both, renewal: [] }, '2026-10-28');
    expect(orm.ok && orm.contract.terms.fee_amount).toBe(16000);
    expect(orm.ok && orm.contract.terms.commission_pct).toBe(3);
  });
  test('4 · bundled HTL0042 / HTL0055 / HTL0118 cards still open (regression)', () => {
    S.setRenewalDemo(true);
    const id = (c: Parameters<typeof S.startRenewal>[0]) => { const o = S.startRenewal(c); return o.ok ? o.req.source_contract_id : o.error; };
    expect(id({ id: 'RN-1', hotelId: 'HTL0042', hotel: 'Grand Palace Bangkok', owner: 'AE001-Nont', contractEnd: '24 Sep 2026' })).toBe('CT-HTL0042');
    expect(id({ id: 'RN-2', hotelId: 'HTL0055', hotel: 'Ocean View Phuket', owner: 'AE001-Nont', contractEnd: '10 Oct 2026' })).toBe('CT-HTL0055');
    const d4 = S.DEMO_EXTRA_CARDS.find((c) => c.id === 'RN-D4')!;
    expect(S.openRequestFor(d4.id)?.source_contract_id ?? id(d4)).toBe('CT-HTL0118');
    S.setRenewalDemo(false);
  });
  test('5 · live mode, unknown contract_id: nothing created, message + activity log entry', () => {
    S.setRenewalDemo(false);
    const before = JSON.stringify(S.sourceContractById('CT-NOPE'));
    const o = S.startRenewal({ id: 'RN-CT-NOPE', hotelId: 'HX', hotel: 'X', owner: 'AE001-Nont', contract_id: 'CT-NOPE' });
    expect(o.ok).toBe(false);
    if (!o.ok) { expect(o.error).toBe('ไม่พบสัญญาต้นทาง CT-NOPE ใน สัญญา & บริการ · แจ้ง PM ตรวจสัญญา'); expect(o.miss?.contract_id).toBe('CT-NOPE'); }
    expect(S.sourceMissesFor('RN-CT-NOPE')[0]?.event).toBe('source_contract_not_found');
    expect(S.sourceMissesFor('RN-CT-NOPE')[0]?.tried).toEqual(['main:CT-NOPE', 'renewal:CT-NOPE']);
    expect(JSON.stringify(S.sourceContractById('CT-NOPE'))).toBe(before); // still null — no contract invented
    expect(S.openRequestFor('RN-CT-NOPE')).toBeNull();
  });
  test('6 · the deep link for the same contract end date finds the open card (one card only)', () => {
    const c = D.renewalR2DemoContract('R2-O4')!;
    const card = SC.newCardFrom(c, 'AE_EARLY', today, 'AE001-Nont');
    expect(SC.openCardFor([card], c)?.id).toBe(card.id);
    expect(SC.scanCandidates([c], [card], today)).toEqual([]);
  });
});

describe('UF2 · owner-only button in testing mode', () => {
  const item = () => D.renewalR2DemoItems().find((i) => i.contract_id === 'R2-O4')!;
  const render = (actor: import('../src/lib/renewal-r2').Actor, onSwitch: (() => void) | null) =>
    renderToStaticMarkup(h(RnCard, { i: item(), today, now: `${today}T03:00:00.000Z`, rec: null, dim: false, hot: false, actor, earlyHref: null, onSwitch, onReason: () => {} }));
  test('8 · PM sees the button disabled with the owner hint and tooltip; no active link', () => {
    const html = render({ id: 'PM001-Alex', role: 'PM' }, () => {});
    const ae = G.aeNameTh(item().ae);
    expect(text(html)).toContain(`เฉพาะ AE เจ้าของสัญญา · ${ae}`);
    expect(html).toContain('disabled=""');
    expect(html).toContain(`title="${G.RENEWAL_OWNER_ONLY_TOOLTIP}"`);
    expect(html).not.toContain('class="rn2-early"');
  });
  test('9 · switch link + banner in testing mode only; the switch picks that AE member', () => {
    const ae = G.aeNameTh(item().ae);
    expect(text(render({ id: 'PM001-Alex', role: 'PM' }, () => {}))).toContain(`สลับเป็น ${ae} เพื่อทดสอบ`);
    const card = () => text(renderToStaticMarkup(h(PsRenewalProvider, null, h(RenewalCardR2, { data: tabR1Demo() }))));
    expect(card()).toContain('ทดสอบในบทบาท PM · PM001-Alex');
    expect(TA.actingRenewalUser('AE001-Nont', false, 'AE002-มายด์')).toBe('AE002-Fern');
    expect(TA.actingRenewalUser('PM001-Alex', true, 'AE002-มายด์')).toBe('PM001-Alex');
    TA.setRenewalTestMode(false);
    expect(text(render({ id: 'PM001-Alex', role: 'PM' }, () => {}))).not.toContain('เพื่อทดสอบ');
    expect(card()).not.toContain('ทดสอบในบทบาท');
    TA.setRenewalTestMode(true);
  });
});

describe('UF3 / UF4', () => {
  test('10 · AE Workspace heading comes from the lead-days config', () => {
    expect(G.RENEWAL_SECTION_TITLE(SC.RENEWAL_CARD_LEAD_DAYS)).toBe('ต้องต่อสัญญา (≤ 60 วัน)');
    expect(G.RENEWAL_SECTION_TITLE(75)).toBe('ต้องต่อสัญญา (≤ 75 วัน)');
  });
  test('11 · saving a reason stages the renewalReasons Cloud doc; storage key name unchanged', () => {
    expect(CLOUD_DOC_KEYS).toContain('renewalReasons');
    RS.setReasonsDemo(false);
    stage.mockClear();
    const o = RS.recordReason({ contract_id: 'CT-R21', service: 'ORM', outcome: 'NOT_RENEWED', picks: [...RS.REASON_KEYS.slice(0, 3)], by: { member_id: 'AE001-Nont', display: 'AE001-Nont', role: 'AE' } }, '2026-11-04T03:00:00.000Z');
    expect(o.ok).toBe(true);
    expect(stage.mock.calls.some((c) => c[0] === 'renewalReasons')).toBe(true);
    expect(Array.isArray(JSON.parse(localStorage.getItem('meridia.renewal-reasons.v1') ?? 'null'))).toBe(true);
  });
});
