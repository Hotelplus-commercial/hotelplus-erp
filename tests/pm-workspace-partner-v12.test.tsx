/* PM Workspace Partner v1.2 §9 — acceptance tests (overview, Partner page, uploads, delivery, hotels, forbidden strings). */
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

const staged: { key: string; body: unknown }[] = [];
const realSync = await import('../src/lib/cloud-sync');
mock.module('../src/lib/cloud-sync', () => ({ ...realSync, stageCloudDoc: (key: string, body: unknown) => { staged.push({ key, body }); } }));

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/workspace/ps/partners?demo=1' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const src = (p: string) => readFileSync(p, 'utf8');
const S = () => import('../src/lib/debt-partner-store');
const W = () => import('../src/lib/partner-workspace');
async function reset(demo = true) { const s = await S(); s.setPartnerDemo(!demo); s.setPartnerDemo(demo); const t = await import('../src/lib/tickets-l0'); t.setTicketDemo(false); t.setTicketDemo(true); }
const DAY = '2026-10-28';

async function mountPage(hash: string) {
  const { act, createElement: h } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { createMemoryHistory, createRootRoute, createRouter, Outlet, RouterProvider } = await import('@tanstack/react-router');
  const { Route } = await import('../src/routes/workspace.ps.partners');
  const root = createRootRoute({ component: () => h(Outlet) });
  Route.update({ id: '/workspace/ps/partners', path: '/workspace/ps/partners', getParentRoute: () => root } as never);
  const routeTree = root.addChildren([Route as never]);
  window.history.replaceState(null, '', `/workspace/ps/partners?demo=1${hash}`);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [`/workspace/ps/partners?demo=1${hash}`] }) });
  document.body.innerHTML = ''; const div = document.createElement('div'); document.body.appendChild(div);
  const root = createRoot(div);
  await act(async () => { await router.load(); root.render(h(RouterProvider, { router } as never)); });
  const t0 = Date.now();
  while (!div.querySelector('[data-testid="pm-partner-page"]')) { if (Date.now() - t0 > 8000) throw new Error('page not mounted: ' + (div.textContent ?? '').slice(0, 400)); await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); }
  await act(async () => { window.dispatchEvent(new Event('hashchange')); await new Promise((r) => setTimeout(r, 30)); });
  return { div, unmount: () => act(() => root.unmount()) };
}

describe('Partner v1.2', () => {
  beforeEach(() => reset(true));

  it('1 overview: summary ≈ ฿95,520, 4 to-dos, 3 Partner cards, upcoming, incomplete, keep credit', async () => {
    const { div, unmount } = await mountPage('');
    const t = div.textContent ?? '';
    expect(div.querySelector('[data-testid="pm-sum-net"]')?.textContent).toBe('≈ ฿95,520');
    expect(div.querySelectorAll('[data-testid="pm-todo-card"]').length).toBe(4);
    expect(div.querySelectorAll('[data-testid^="pm-pcard-"]:not([data-testid="pm-pcard-alert"])').length).toBe(3);
    expect(div.querySelector('[data-testid="pm-upcoming-changes"]')?.textContent).toContain('Mae Ping Riverside');
    expect(div.querySelector('[data-testid="pm-incomplete"]')?.textContent).toContain('OTA Hub');
    expect(t).toContain('เครดิตค่าระบบ (Keep credit)');
    await unmount();
  }, 20000);

  it('2 old hashes + to-do deep links map to the new views', async () => {
    const w = await W(); const s = await S();
    for (const h of ['', '#overview', '#partner', '#ratecard', '#deals']) expect(w.viewOfHash(h)).toEqual({ v: 'overview' });
    expect(w.viewOfHash('#credit')).toEqual({ v: 'credit', anchor: null });
    expect(w.viewOfHash('#credit-waiting')).toEqual({ v: 'credit', anchor: 'credit-waiting' });
    expect(w.viewOfHash('#deals/PTN-SL')).toEqual({ v: 'partner', id: 'PTN-SL', section: 'deals' });
    expect(w.viewOfHash('#partner/PTN-SL/hotels')).toEqual({ v: 'partner', id: 'PTN-SL', section: 'hotels' });
    const { partnerContracts } = await import('../src/lib/partner-contracts');
    const d = s.getPartnerData(); const items = w.partnerTodoItems(d, partnerContracts(d, true), DAY, 'today', 'PM');
    expect(items.length).toBe(4);
    for (const it of items) { const v = w.viewOfHash(`#${it.route_target.split('#')[1]}`); expect(['credit', 'partner']).toContain(v.v); }
  });

  it('3 Partner page: sections + anchors; Edit Partner saves name / contact / storage location', async () => {
    const { div, unmount } = await mountPage('#partner/PTN-SL');
    for (const k of ['docs', 'hotels', 'price', 'deals', 'credit']) { expect(div.querySelector(`#sec-${k}`)).not.toBeNull(); expect(div.querySelector(`[data-testid="pm-nav-${k}"]`)).not.toBeNull(); }
    await unmount();
    const s = await S();
    expect(s.updatePartner('PTN-SL', { name: 'StayLink', doc_folder_url: 'http://x' }).ok).toBe(false);
    expect(s.updatePartner('PTN-SL', { name: 'OTA Hub' }).ok).toBe(false);
    expect(s.updatePartner('PTN-SL', { name: 'StayLink TH', contact_name: '[ชื่อผู้ติดต่อ]', contact_email: 'a@b.co', doc_folder_url: 'https://drive.google.com/drive/folders/Partners/StayLink' }).ok).toBe(true);
    const p = s.getPartnerData().partners.find((x) => x.id === 'PTN-SL')!;
    expect([p.name, p.contact_email, p.doc_folder_url]).toEqual(['StayLink TH', 'a@b.co', 'https://drive.google.com/drive/folders/Partners/StayLink']);
    const page = src('src/routes/workspace.ps.partners.tsx');
    expect(page).toContain('onForm({ kind: "partner", partner: p })');
    expect(page).not.toContain('onForm({ kind: "rate", card: mine[0]');
  }, 20000);

  it('4 upload: valid → PENDING; bad type / > 20 MB rejected; multi-file; edit / delete removes bytes; bytes never in Cloud payload', async () => {
    await reset(false); staged.length = 0;
    const s = await S(); const F = await import('../src/lib/partner-files');
    s.addPartner('Upload Test', 'PM'); const pid = s.getPartnerData().partners.find((p) => p.name === 'Upload Test')!.id;
    const ok1 = new File(['%PDF secret-bytes'], 'contract.pdf', { type: 'application/pdf' });
    const ok2 = new File(['x'], 'quote.xlsx');
    const bad = new File(['x'], 'run.exe');
    const big = { name: 'big.pdf', size: 21 * 1024 * 1024, type: 'application/pdf' } as File;
    const r = await s.addPartnerUploads(pid, [ok1, ok2, bad, big], 'สัญญา Partner', 'PM');
    expect(r.added.length).toBe(2);
    expect(r.errors).toEqual(['run.exe: ไม่รองรับไฟล์ประเภทนี้ (รับ PDF · Word · Excel · รูปภาพ · อีเมล (.eml))', 'big.pdf: ไฟล์ใหญ่เกิน 20 MB']);
    const items = s.partnerAttachments(s.getPartnerData(), pid);
    expect(items.map((a) => [a.source, a.storage_status, s.attachmentStatus(a)])).toEqual([['UPLOAD', 'PENDING', 'PENDING'], ['UPLOAD', 'PENDING', 'PENDING']]);
    const a = items.find((x) => x.name === 'contract.pdf')!;
    expect(await (await F.getPartnerFile(a.file_ref!))!.text()).toBe('%PDF secret-bytes');
    expect(s.updatePartnerAttachment(pid, a.id, { name: 'สัญญา 2026.pdf', kind: 'อื่น ๆ', url: '', note: 'n' }).ok).toBe(true);
    expect(JSON.stringify(staged)).not.toContain('secret-bytes');
    expect(staged.every((x) => x.key.startsWith('partner:'))).toBe(true);
    expect(s.removePartnerAttachment(pid, a.id).ok).toBe(true);
    await new Promise((res) => setTimeout(res, 5));
    expect(F.hasPartnerFileInMemory(a.file_ref!)).toBe(false);
  });

  it('5 deliverPartnerFile: not connected → stays PENDING; stub connector → STORED + stored_url', async () => {
    const s = await S();
    const att = s.partnerAttachments(s.getPartnerData(), 'PTN-SL')[0]!;
    expect(await s.deliverPartnerFile('PTN-SL', att.id)).toEqual({ ok: false, reason: 'NOT_CONNECTED' });
    expect(s.attachmentStatus(s.partnerAttachments(s.getPartnerData(), 'PTN-SL')[0]!)).toBe('PENDING');
    const r = await s.deliverPartnerFile('PTN-SL', att.id, async (folder, _b, name) => `${folder}/${encodeURIComponent(name)}`);
    expect(r.ok).toBe(true);
    const after = s.partnerAttachments(s.getPartnerData(), 'PTN-SL')[0]!;
    expect([s.attachmentStatus(after), after.stored_url?.startsWith('https://drive.google.com/drive/folders/Partners/StayLink/')]).toEqual(['STORED', true]);
    expect(src('src/components/ps/partner-attachments.tsx')).toContain('s === "STORED" ? a.stored_url : a.url');
  });

  it('6 link fallback still works; card ③ popover read-only with PENDING label', async () => {
    const s = await S();
    expect(s.addPartnerAttachment('PTN-OH', { name: 'L', kind: 'อื่น ๆ', url: 'https://x.co/a' }, 'PM').ok).toBe(true);
    expect(s.attachmentStatus(s.partnerAttachments(s.getPartnerData(), 'PTN-OH')[0]!)).toBe('LINK');
    const ui = src('src/components/ps/partner-attachments.tsx');
    const pop = ui.slice(ui.indexOf('export function AttachmentCountPopover'));
    expect(pop).toContain('<AttachmentTable items={items} />'); // no onEdit / onRemove
    expect(ui).toContain('short ? PENDING_TH');
  });

  it('7 hotels: StayLink includes Mae Ping as upcoming from OTA Hub; OTA Hub shows moving out; history tags; 1 Dec 26 dates', async () => {
    const s = await S(); const w = await W(); const { partnerContracts } = await import('../src/lib/partner-contracts');
    const d = s.getPartnerData(); const cs = partnerContracts(d, true); const name = (pid: string) => pid;
    const sl = w.partnerHotelRows(d, cs, DAY, 'PTN-SL', name), oh = w.partnerHotelRows(d, cs, DAY, 'PTN-OH', name);
    expect(sl[0]).toMatchObject({ pid: 'HP-MAEPING', status: 'UPCOMING', other: 'PTN-OH', date: '2026-12-01' });
    expect(sl.filter((r) => r.status !== 'UPCOMING').length).toBe(20);
    expect(oh.find((r) => r.pid === 'HP-MAEPING')).toMatchObject({ status: 'LEAVING', other: 'PTN-SL', date: '2026-12-01' });
    const { propertySystemHistory } = await import('../src/lib/debt-partner-calc');
    const hist = propertySystemHistory(d, 'HP-MAEPING'); const tags = w.historyTag(hist, DAY);
    expect(hist.map((h) => tags[h.id])).toEqual(['FUTURE', 'CURRENT']);
    const { dDMY } = await import('../src/components/ps/partner-section');
    expect(dDMY('2026-12-01')).toBe('1 Dec 26');
    expect(src('src/components/ps/partner-system-ui.tsx')).toContain('{dmy(h.effective_from)');
    const { div, unmount } = await mountPage('#partner/PTN-SL/hotels');
    expect(div.querySelector('[data-testid="pm-hotel-HP-MAEPING"]')?.textContent).toContain('รอมีผล · ย้ายมาจาก OTA Hub');
    await unmount();
    const o = await mountPage('#partner/PTN-OH/hotels');
    expect(o.div.querySelector('[data-testid="pm-hotel-HP-MAEPING"]')?.textContent).toContain('ย้ายออก 1 Dec 26 → StayLink');
    await o.unmount();
  }, 20000);

  it('8 Mae Ping history in ≤ 3 clicks: header button → overview upcoming row → Hotel Profile ORM', async () => {
    expect(src('src/components/workspace/workspace-shell.tsx')).toContain('to="/workspace/ps/partners"');
    const { div, unmount } = await mountPage('');
    const a = div.querySelector('[data-testid="pm-upcoming-hotel"]') as HTMLAnchorElement;
    expect(a.textContent).toBe('Mae Ping Riverside');
    expect(a.getAttribute('href')).toBe('/ps/property-content/HP-MAEPING?demo=1#orm');
    await unmount();
  }, 20000);

  it('9 card ② footnote has no raw key; forbidden strings absent from every Partner view (DEMO)', async () => {
    expect(src('src/components/ps/debt-cards-r11.tsx')).not.toContain('SYSTEM_SHUTOFF ของสัญญา');
    expect(src('src/components/ps/debt-cards-r11.tsx')).toContain('ticket ขอปิดระบบของสัญญา (จาก AC App)');
    const { domHits } = await import('./forbidden-words');
    for (const h of ['', '#credit', '#partner/PTN-SL', '#partner/PTN-HG', '#partner/PTN-OH']) {
      const { div, unmount } = await mountPage(h);
      expect([h, domHits(div)]).toEqual([h, []]);
      await unmount();
    }
  }, 30000);

  it('10 PS Dashboard Partner cards: still no edit controls', () => {
    const s = src('src/components/ps/partner-section.tsx');
    expect(s).toContain('isPm={false} onForm={setForm} manage=');
    expect(s).toContain('{false && <PartnerFormDrawer');
  });
});
