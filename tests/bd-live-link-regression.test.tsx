/* Contract Renewal v1.2/v1.3 — BD regression: the BD new-contract LIVE Link page (/l/$token) still shows
 * the contract, invoice and payment blocks, and signing works. Test only; the BD page is not changed. */
import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

mock.module('../src/lib/cloud-sync', () => ({ stageCloudDoc: () => {} }));

const TOKEN = 'bd-regression-0001';
const CRM_KEY = 'hotelplus-crm-v1';

beforeAll(() => { GlobalRegistrator.register({ url: 'http://localhost:8080/' }); (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(async () => { await GlobalRegistrator.unregister(); });

const until = async (f: () => boolean, ms = 3000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 20)); } };

describe('BD new-contract LIVE Link regression', () => {
  test('shows contract, invoice and payment blocks; signing works', async () => {
    const { act, createElement: h } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } = await import('@tanstack/react-router');
    const seed = await import('../src/lib/crm-seed');
    const { CrmStoreProvider } = await import('../src/lib/crm-store');
    const { Route } = await import('../src/routes/l.$token');

    // Seed: BD deal at the contract-sent stage, Customer ID + Hotel ID already registered, invoice + live link issued.
    const customer = seed.seedCustomers[0]!;
    const hotel = customer.hotels[0]!;
    const deal = { ...seed.seedDeals[0]!, status: 'Contract Sent', customer_id: customer.customer_id };
    const contract = { ...seed.seedContracts[0]!, hotel_id: hotel.hotel_id, status: 'follow_up_contract' as const };
    const invoice = { ...seed.seedInvoices.find((i) => i.contract_ids.includes(contract.contract_id))!, status: 'sent_via_live_link' as const };
    expect(deal.customer_id).toBe(customer.customer_id);
    expect(hotel.hotel_id).toBeTruthy();
    const link = { token: TOKEN, case_number: contract.case_number!, contract_ids: [contract.contract_id], invoice_id: invoice.invoice_id, events: [], signature_data_url: null, created_at: '2026-10-19T03:00:00.000Z' };
    localStorage.setItem(CRM_KEY, JSON.stringify({
      products: seed.seedProducts, customers: [customer], deals: [deal], templates: seed.seedTemplates, quotations: [], contracts: [contract],
      reports: [], invRequests: [], invoices: [invoice], taxReceipts: [], liveLinks: [link], audit: [], actor: 'ac.team@hotelplus.asia',
    }));

    // Canvas stub so the signature pad can be drawn on in the simulated browser.
    const ctx = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, clearRect() {}, lineWidth: 0, lineCap: '', strokeStyle: '' };
    Object.assign(HTMLCanvasElement.prototype, { getContext: () => ctx, toDataURL: () => 'data:image/png;base64,AAAA' });

    const Page = Route.options.component!;
    const root = createRootRoute({ component: () => h(CrmStoreProvider, null, h(Outlet)) });
    const leaf = createRoute({ getParentRoute: () => root, path: '/l/$token', component: Page });
    const router = createRouter({ routeTree: root.addChildren([leaf]), history: createMemoryHistory({ initialEntries: [`/l/${TOKEN}`] }) });
    const el = document.createElement('div'); document.body.appendChild(el);
    await act(async () => { await router.load(); createRoot(el).render(h(RouterProvider, { router } as never)); });
    await until(() => el.textContent?.includes('ลงนามดิจิทัล') ?? false);

    const text = () => el.textContent ?? '';
    expect(text()).toContain('HotelPlus · LIVE Link');
    expect(text()).toContain('สัญญา');
    expect(text()).toContain(contract.contract_id);
    expect(text()).toContain(`ใบแจ้งหนี้ ${invoice.invoice_id}`);
    expect(text()).toContain('ยอดชำระ');
    expect(text()).toContain('ชำระเงิน');
    const pay = [...el.querySelectorAll('button')].find((b) => b.textContent?.startsWith('ชำระ'))!;
    expect(pay.disabled).toBe(true); // payment unlocks only after signing

    const canvas = el.querySelector('canvas')!;
    await act(async () => {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 40 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    const signBtn = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('ยืนยันลงนาม'))!;
    expect(signBtn.disabled).toBe(false);
    await act(async () => { signBtn.click(); });
    await until(() => text().includes('ลงนามเรียบร้อยแล้ว'));
    expect(text()).toContain('ลงนามแล้ว');
    const payAfter = [...el.querySelectorAll('button')].find((b) => b.textContent?.startsWith('ชำระ'))!;
    expect(payAfter.disabled).toBe(false);
    await until(() => JSON.parse(localStorage.getItem(CRM_KEY) ?? '{}').contracts?.[0]?.status === 'customer_completed');
    const saved = JSON.parse(localStorage.getItem(CRM_KEY)!);
    expect(saved.liveLinks[0].events.some((e: { type: string }) => e.type === 'signed')).toBe(true);
  });
});
