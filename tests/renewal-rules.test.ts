import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_RENEWAL_CONFIG, minRaiseApplied, systemDefaultFee, approve, cancel, defaultNewTerms, editTerms, evaluate, gatesPass, initialHistory, isOverdue, priceOn, recommend,
  renewalHistoryRow, returnRequest, rollDates, sendLink, sign, submit, type RecoMode, type RecoSnapshot, type RenewalRequest, type Terms,
} from '../src/lib/renewal-rules';
import { wizardPathRedirects } from '../src/lib/renewal-wizard';
import { attachmentError } from '../src/lib/tickets-l0';
import { readFileSync } from 'node:fs';

const OLD: Terms = { fee_amount: 10000, commission_pct: 0, term_months: 12, package: 'ORM Full', start_date: '2025-10-01', end_date: '2026-09-30' };
const reco = (type: RecoSnapshot['type']): RecoSnapshot => ({ type, band_min_pct: type === 'RAISE' ? 5 : null, band_max_pct: type === 'RAISE' ? 12 : null, reasons: [], inputs: {}, computed_at: '2026-09-30' });
const roll = (t: Partial<Terms>): Terms => ({ ...OLD, ...rollDates(OLD.end_date, 12), ...t });
const NOW = '2026-09-30T05:00:00.000Z';
const req = (p: Partial<RenewalRequest> = {}): RenewalRequest => ({ id: 'RR-00001', renewal_card_id: 'RN-1', source_contract_id: 'CT-1', hotel_id: 'H1', hotel_name: 'H', customer_id: 'C1', ae_owner_id: 'AE001-Nont', reco_snapshot: reco('RAISE'), old_terms: OLD, new_terms: roll({ fee_amount: 10850 }), changed_fields: ['fee_amount'], deviates_from_reco: false, approval_required: true, reason_code: null, reason_text: '', entity_change: false, entity_ticket_id: null, status: 'DRAFT', submitted_at: null, approved_by: null, approver_role: null, approved_at: null, return_comment: null, link_sent_at: null, signed_at: null, new_contract_id: null, created_at: NOW, updated_at: NOW, ...p });

describe('§3 approval matrix', () => {
  for (const mode of ['SOFT_FORCE', 'ADVISORY'] as RecoMode[]) {
    const ev = (r: RecoSnapshot['type'], t: Partial<Terms>) => evaluate(reco(r), OLD, roll(t), mode);
    test(`${mode}: KEEP + old terms → no approval, no reason`, () => expect(ev('KEEP', {})).toMatchObject({ approval_required: false, reason_required: false }));
    test(`${mode}: HOLD / NONE + old terms → no approval`, () => { expect(ev('HOLD', {}).approval_required).toBe(false); expect(ev('NONE', {}).approval_required).toBe(false); });
    test(`${mode}: RAISE within band → approval, no reason`, () => expect(ev('RAISE', { fee_amount: 10500 })).toMatchObject({ approval_required: true, reason_required: false }));
    test(`${mode}: RAISE + old / below / above band → reason required`, () => {
      for (const fee of [10000, 10300, 11500]) expect(ev('RAISE', { fee_amount: fee })).toMatchObject({ approval_required: mode === 'SOFT_FORCE', reason_required: true });
    });
    test(`${mode}: fee decrease → approval + reason (any reco)`, () => { for (const r of ['KEEP', 'RAISE', 'HOLD'] as const) expect(ev(r, { fee_amount: 9000 })).toMatchObject({ approval_required: true, reason_required: true }); });
    test(`${mode}: commission / term / package change → approval + reason`, () => {
      for (const t of [{ commission_pct: 5 }, { term_months: 24 }, { package: 'ORM Lite' }]) expect(ev('KEEP', t)).toMatchObject({ approval_required: true, reason_required: true });
    });
  }
  test('date roll-forward is never a change; new start = old end + 1', () => {
    expect(rollDates('2026-09-30', 12)).toEqual({ start_date: '2026-10-01', end_date: '2027-09-30' });
    expect(evaluate(reco('KEEP'), OLD, roll({}), 'SOFT_FORCE').changed_fields).toEqual([]);
  });
});

describe('§2 recommendation', () => {
  const row = (p: Record<string, unknown>) => ({ hotel_id: 'H1', gate_pass: true, trigger: 'signal', revenue_profile: 'moderate', band_min_pct: 5, band_max_pct: 12, why_chips: 'ราคาต่ำกว่ามูลค่า', ...p });
  test('RAISE default fee = midpoint, rounded to nearest ฿100 (v1.3)', () => { const r = recommend(row({}), OLD, true, NOW); expect(r.type).toBe('RAISE'); expect(defaultNewTerms(OLD, r).fee_amount).toBe(10900); });
  test('declining → HOLD; not listed → KEEP; no data → NONE; commission-only → KEEP', () => {
    expect(recommend(row({ revenue_profile: 'declining', gate_pass: false }), OLD, true, NOW).type).toBe('HOLD');
    expect(recommend(undefined, OLD, true, NOW).type).toBe('KEEP');
    expect(recommend(undefined, OLD, false, NOW).type).toBe('NONE');
    expect(recommend(row({}), { ...OLD, fee_amount: 0, commission_pct: 8 }, true, NOW).type).toBe('KEEP');
  });
});

describe('approval, gates and signing', () => {
  const cfg = DEFAULT_RENEWAL_CONFIG;
  test('approve → APPROVED → READY_TO_SEND; first action wins', () => {
    const s = submit(req(), 'SOFT_FORCE', true, NOW); expect(s.ok && s.req.status).toBe('PENDING_APPROVAL');
    const a = s.ok ? approve(s.req, 'PM001', 'PM', true, NOW, NOW, cfg) : null;
    expect(a?.ok && a.req.status).toBe('READY_TO_SEND');
    expect(a?.ok && a.req.approver_role).toBe('PM');
    expect(a?.ok && approve(a.req, 'HOC', 'HOC', true, NOW, NOW, cfg).ok).toBe(false);
  });
  test('return → RETURNED (comment required) → edit → DRAFT', () => {
    const p = req({ status: 'PENDING_APPROVAL', submitted_at: NOW });
    expect(returnRequest(p, 'PM', 'PM', '', NOW, NOW, cfg).ok).toBe(false);
    const r = returnRequest(p, 'PM', 'PM', 'ลองใหม่', NOW, NOW, cfg); expect(r.ok && r.req.status).toBe('RETURNED');
    const e = r.ok ? editTerms(r.req, roll({ fee_amount: 10600 }), 'SOFT_FORCE', NOW) : null; expect(e?.ok && e.req.status).toBe('DRAFT');
  });
  test('overdue after 2 Bangkok days; HOC / MD act only when overdue', () => {
    const p = req({ status: 'PENDING_APPROVAL', submitted_at: '2026-09-27T03:00:00.000Z' });
    expect(isOverdue(p, NOW, cfg)).toBe(true);
    expect(isOverdue({ ...p, submitted_at: '2026-09-28T03:00:00.000Z' }, NOW, cfg)).toBe(false);
    expect(approve({ ...p, submitted_at: '2026-09-29T03:00:00.000Z' }, 'MD', 'MD', true, NOW, NOW, cfg).ok).toBe(false);
    const a = approve(p, 'HOC', 'HOC', true, NOW, NOW, cfg); expect(a.ok && a.req.approver_role).toBe('HOC');
  });
  test('entity gate: link locked until AC ticket closed', () => {
    const r = req({ status: 'APPROVED', entity_change: true });
    expect(gatesPass(r, false)).toBe(false); expect(gatesPass(r, true)).toBe(true);
    const k = submit(req({ reco_snapshot: reco('KEEP'), new_terms: roll({}), entity_change: true }), 'SOFT_FORCE', false, NOW);
    expect(k.ok && k.req.status).toBe('DRAFT');
    expect(sendLink(req({ status: 'APPROVED' }), NOW).ok).toBe(false);
  });
  test('attachments: ≤5 files, ≤5 MB, PDF/JPG/PNG', () => {
    expect(attachmentError(0, { size: 1000, mime: 'application/pdf' })).toBeNull();
    expect(attachmentError(5, { size: 1000, mime: 'image/png' })).not.toBeNull();
    expect(attachmentError(0, { size: 6 * 1024 * 1024, mime: 'image/png' })).not.toBeNull();
    expect(attachmentError(0, { size: 10, mime: 'text/plain' })).not.toBeNull();
  });
  test('sign: new contract from old end + 1, RENEWAL history row, billing price switches on start date', () => {
    const s = sign(req({ status: 'LINK_SENT' }), NOW); expect(s.ok).toBe(true);
    if (!s.ok) return;
    const hist = [...initialHistory([{ contract_id: 'CT-1', terms: OLD }]), renewalHistoryRow(s.req, 1)];
    expect(hist[1]).toMatchObject({ source: 'RENEWAL', cycle_no: 2, effective_from: '2026-10-01', fee_amount: 10850 });
    expect(priceOn(hist, '2026-09-30')?.fee_amount).toBe(10000);
    expect(priceOn(hist, '2026-10-01')?.fee_amount).toBe(10850);
  });
  test('cancel only from draft / returned', () => { expect(cancel(req(), NOW).ok).toBe(true); expect(cancel(req({ status: 'LINK_SENT' }), NOW).ok).toBe(false); });
});

describe('§0.3 wizard entry points', () => {
  test('bare /ps/contract-wizard/ redirects; id routes never do', () => {
    expect(wizardPathRedirects('/ps/contract-wizard/')).toBe(true);
    expect(wizardPathRedirects('/ps/contract-wizard/renew/CT-HTL0042')).toBe(false);
    expect(wizardPathRedirects('/ps/contract-wizard/HTL0042')).toBe(false);
  });
  test('no generic create button; renewal card opens renewal mode with contract_id', () => {
    expect(readFileSync('src/routes/ps.contract-dashboard.tsx', 'utf8')).not.toContain('สร้างสัญญา</');
    const card = readFileSync('src/components/ps/renewal-ui.tsx', 'utf8');
    expect(card).not.toContain('Generate contract');
    expect(readFileSync('src/components/ps/renewal-request-ui.tsx', 'utf8')).toContain('"/ps/contract-wizard/renew/$contractId", params: { contractId: o.req.source_contract_id }');
    expect(readFileSync('src/routes/ps.contract-wizard.new.tsx', 'utf8')).toContain('if (!search.quote_id) throw redirect');
  });
});

describe('v1.1 patch', () => {
  test('no rollback path exists in store, provider or glossary', async () => {
    const store = await import('../src/lib/renewal-store');
    const g = await import('../src/lib/ps-glossary');
    expect('recordRollback' in store).toBe(false);
    expect(Object.keys(g.RENEWAL_LABEL_TH)).not.toContain('rollback');
    expect(Object.keys(g.RENEWAL_LABEL_TH)).not.toContain('recordDecline');
  });
  test('demo case 7: SIGNED, card not closed → signed badge; marked done → badge cleared', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const c7 = s.DEMO_EXTRA_CARDS.find((c) => c.id === 'RN-D7')!;
    expect(s.latestRequestFor(c7.id)?.status).toBe('SIGNED');
    expect(s.signedAwaitingDone(c7)).toBe(true);
    expect(s.signedAwaitingDone({ ...c7, status: 'COMPLETED' })).toBe(false);
    s.setRenewalDemo(false);
  });
  test('signing does not close the card: LINK_SENT → SIGNED leaves the card open', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const c6 = s.DEMO_EXTRA_CARDS.find((c) => c.id === 'RN-D6')!;
    const r = s.latestRequestFor(c6.id)!;
    expect(s.signRequest(r.id).ok).toBe(true);
    expect(s.signedAwaitingDone(c6)).toBe(true);
    s.setRenewalDemo(false);
  });
  test('create & send in one action: no-approval draft → LINK_SENT', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const o = s.startRenewal({ id: 'RN-1', hotelId: 'HTL0055', hotel: 'Ocean View Phuket', owner: 'AE001-Nont' });
    expect(o.ok).toBe(true);
    if (o.ok && !o.req.approval_required) expect(s.createAndSendLink(o.req.id).ok && s.requestById(o.req.id)?.status).toBe('LINK_SENT');
    s.setRenewalDemo(false);
  });
});

describe('v1.2 live link', () => {
  const mem: Record<string, string> = {};
  (globalThis as any).localStorage ??= { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  test('send creates a token record; card path uses the token, not the request id', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const o = s.startRenewal({ id: 'RN-1', hotelId: 'HTL0055', hotel: 'Ocean View Phuket', owner: 'AE001-Nont' });
    if (!o.ok || o.req.approval_required) { s.setRenewalDemo(false); return; }
    expect(s.createAndSendLink(o.req.id).ok).toBe(true);
    const l = s.currentLinkFor(o.req.id)!;
    expect(l.kind).toBe('RENEWAL'); expect(l.status).toBe('ACTIVE');
    expect(s.liveLinkPathFor(o.req.id)).toBe(`/l/renew/${l.token}`);
    expect(s.linkByToken(l.token)?.snapshot.request.id).toBe(o.req.id);
    expect(s.sendRenewalLink(o.req.id).ok && s.currentLinkFor(o.req.id)!.token).toBe(l.token);
    s.setRenewalDemo(false);
  });
  test('seeded LINK_SENT / SIGNED demo requests have link records; sign by token → SIGNED', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const d6 = s.latestRequestFor('RN-D6')!; const d7 = s.latestRequestFor('RN-D7')!;
    expect(s.currentLinkFor(d6.id)?.status).toBe('ACTIVE');
    expect(s.currentLinkFor(d7.id)?.status).toBe('SIGNED');
    const t = s.currentLinkFor(d6.id)!.token;
    expect(s.signByToken(t, 'คุณนภา').ok).toBe(true);
    expect(s.linkByToken(t)?.status).toBe('SIGNED');
    expect(s.requestById(d6.id)?.status).toBe('SIGNED');
    s.setRenewalDemo(false);
  });
  test('Mark as Done ไม่ต่อ revokes the link', async () => {
    const s = await import('../src/lib/renewal-store');
    s.setRenewalDemo(true);
    const d6 = s.latestRequestFor('RN-D6')!; const t = s.currentLinkFor(d6.id)!.token;
    expect(s.declineRequest(d6.id, 'ลูกค้าไม่ต่อ').ok).toBe(true);
    expect(s.linkByToken(t)?.status).toBe('REVOKED');
    s.setRenewalDemo(false);
  });
  test('validity: never expires (null) unless a validity is configured', async () => {
    const s = await import('../src/lib/renewal-store');
    expect(s.RENEWAL_LINK_VALID_DAYS).toBeNull();
    const base = { status: 'ACTIVE', expires_at: '2026-01-01T00:00:00.000Z' } as any;
    expect(s.isExpired(base, '2026-02-01T00:00:00.000Z')).toBe(true);
    expect(s.isExpired({ ...base, expires_at: null }, '2099-01-01T00:00:00.000Z')).toBe(false);
  });
});

describe('v1.3 default fee: nearest ฿100 + minimum raise', () => {
  const band = (lo: number, hi: number): RecoSnapshot => ({ type: 'RAISE', band_min_pct: lo, band_max_pct: hi, reasons: [], inputs: {}, computed_at: NOW });
  const MIN = DEFAULT_RENEWAL_CONFIG.renewal_min_raise_thb;
  const t = (fee: number): Terms => ({ ...OLD, fee_amount: fee });
  test('config default is 500', () => expect(MIN).toBe(500));
  test('12,000 × 1.085 = 13,020 → 13,000 (no minimum)', () => { expect(systemDefaultFee(12000, band(5, 12), MIN)).toBe(13000); expect(minRaiseApplied(12000, band(5, 12), MIN)).toBe(false); });
  test('4,850 × 1.04 = 5,044 → 5,000 → minimum → 5,400', () => { expect(systemDefaultFee(4850, band(2, 6), MIN)).toBe(5400); expect(minRaiseApplied(4850, band(2, 6), MIN)).toBe(true); });
  test('7,350 × 1.04 = 7,644 → 7,600 → minimum → 7,900', () => expect(systemDefaultFee(7350, band(2, 6), MIN)).toBe(7900));
  test('1,000 × 1.04 → 1,500', () => expect(systemDefaultFee(1000, band(2, 6), MIN)).toBe(1500));
  test('keep-same / hold / no-reco → old fee unchanged (no rounding, no minimum)', () => {
    for (const type of ['KEEP', 'HOLD', 'NONE'] as const) expect(defaultNewTerms(t(4850), reco(type), MIN).fee_amount).toBe(4850);
  });
  test('the system default never needs a reason (even outside the band)', () => {
    for (const mode of ['SOFT_FORCE', 'ADVISORY'] as RecoMode[]) for (const [fee, b] of [[1000, band(2, 6)], [4850, band(2, 6)], [7350, band(2, 6)], [12000, band(5, 12)]] as const) {
      const next = defaultNewTerms(t(fee), b, MIN);
      expect(evaluate(b, t(fee), next, mode, MIN)).toMatchObject({ approval_required: true, reason_required: false, deviates_from_reco: false });
    }
  });
  test('an AE amount outside the band (not the default) still needs a reason', () => expect(evaluate(band(2, 6), t(1000), { ...t(1000), fee_amount: 1400 }, 'SOFT_FORCE', MIN).reason_required).toBe(true));
  test('changing renewal_min_raise_thb changes the result', () => {
    expect(systemDefaultFee(4850, band(2, 6), 1000)).toBe(5900);
    expect(systemDefaultFee(4850, band(2, 6), 100)).toBe(5000);
    expect(minRaiseApplied(4850, band(2, 6), 100)).toBe(false);
  });
});
