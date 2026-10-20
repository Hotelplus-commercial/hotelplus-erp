/* R1.1 §4 — render dashboard tabs in demo mode and fail on any forbidden display string. */
import { describe, expect, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
async function render(el: ReactElement) {
  const rootRoute = createRootRoute({ component: () => el });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  await router.load();
  return renderToStaticMarkup(h(QueryClientProvider, { client: new QueryClient() }, h(RouterProvider, { router } as never)));
}
import { PsReportTab } from '../src/components/ps/ps-report-tab';
import { MeetingAnalyzerTab } from '../src/components/ps/meeting-analyzer-tab';
import { Account360Provider } from '../src/components/ps/account-360';
import { DashboardGlobal, defaultGlobalFilter, selectedPeriod } from '../src/lib/ps-dashboard-global';
import { buildDemoReport, DEMO_NOW } from '../src/lib/ps-demo-fixture';
import { demoMeetingReport, MEETING_DEMO_NOW } from '../src/lib/meeting-dashboard-demo';
import { AcTab } from '../src/components/ps/ac-tab';
import { TaskTab } from '../src/components/ps/task-tab';
import { TaskWorklistV2 } from '../src/components/ps/task-worklist-v2';
import { ServicingTab } from '../src/components/ps/servicing-tab';
import { demoAcViews } from '../src/lib/ps-demo-fixture';
import { HrMembersProvider } from '../src/lib/hr-members';
import { Ws2Provider } from '../src/lib/ws2-store';
import { ServicingProvider } from '../src/lib/ps-servicing';
import { getWorklist } from '../src/lib/task-worklist';
import { taskDemo, demoCareHotels, demoServiceContracts, demoTaskMeetings, TASK_DEMO_NOW } from '../src/lib/task-demo';
import { SEED_CATEGORIES } from '../src/lib/task-tickets';

const FORBIDDEN = ['RENEWAL_TERMS_APPROVAL', 'CUSTOMER_ENTITY_CHANGE', 'SOFT_FORCE', 'ADVISORY', 'SERVICING_STALL', 'CONTRACT_FOLLOWUP', 'UPSELL_PITCH', 'RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW', 'ASSIGNMENT_PENDING', 'RENEWED', 'NOT_RENEWED', 'IN_PROGRESS', 'LOST', 'NPS', 'row-1', '★', 'เพดาน', 'เคส PS', 'Ticket ระบบ', 'HTL-', 'รอ BOT', 'customer_segment', 'EXISTING'];
const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function hits(text: string) {
  const found = FORBIDDEN.filter((w) => text.includes(w));
  if (/(^|[^A-Za-z0-9])P[123](?![A-Za-z0-9])/.test(text)) found.push('P1/P2/P3');
  // R1.2 §7: "NEW" as a stand-alone chip/word (raw segment or ticket status code).
  if (/(^|[^A-Za-z0-9_])NEW(?![A-Za-z0-9_])/.test(text)) found.push('NEW');
  return found;
}

describe('R1.1 forbidden strings (demo mode)', () => {
  test('Tab PS', async () => {
    const report = buildDemoReport(defaultGlobalFilter);
    const now = new Date(DEMO_NOW);
    const html = await render(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
        h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, now) }, loading: false, error: false }) })),
    );
    expect(html.length).toBeGreaterThan(1000);
    expect(hits(visibleText(html))).toEqual([]);
  });
  test('Meeting & Survey', async () => {
    const html = await render(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: String(MEETING_DEMO_NOW) } },
        h(MeetingAnalyzerTab, { report: demoMeetingReport(), loading: false, error: false })),
    );
    expect(html.length).toBeGreaterThan(1000);
    expect(hits(visibleText(html))).toEqual([]);
  });
  test('ลูกหนี้ & ค่าใช้จ่ายรายสัญญา (all lists open)', async () => {
    const period = selectedPeriod(defaultGlobalFilter, new Date(DEMO_NOW));
    const html = await render(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
        h(AcTab, { views: demoAcViews(), loading: false, error: false, service: 'ALL', compare: false, demo: true, periodA: period, periodB: null, openLists: true })),
    );
    expect(html).toContain('ลูกหนี้ที่ต้องติดตาม');
    expect(html).toContain('ค่าใช้จ่ายรายสัญญา');
    expect(html).not.toContain('รายได้รายโรงแรม');
    expect(hits(visibleText(html))).toEqual([]);
  });
  test('ติดตามงานผู้ให้บริการ (tab + worklist rows)', async () => {
    const value = { filter: defaultGlobalFilter, demo: true, now: TASK_DEMO_NOW };
    const tab = await render(h(DashboardGlobal.Provider, { value }, h(HrMembersProvider, { children: h(Ws2Provider, { children: h(TaskTab) }) })));
    const care = demoCareHotels(), fx = taskDemo(SEED_CATEGORIES, care);
    const rows = getWorklist(fx.cases, fx.tickets, SEED_CATEGORIES, care, TASK_DEMO_NOW);
    const list = await render(h(DashboardGlobal.Provider, { value }, h(TaskWorklistV2, { rows, categories: SEED_CATEGORIES, now: new Date(TASK_DEMO_NOW), demo: true, compare: false, onCreate: () => {}, onCase: () => {}, meetings: demoTaskMeetings(), contracts: demoServiceContracts(care) })));
    expect(list).toContain('จากการประชุม');
    expect(list).toContain('ผู้ติดตาม');
    expect(hits(visibleText(tab))).toEqual([]);
    expect(hits(visibleText(list))).toEqual([]);
  });
  test('On-board', async () => {
    const html = await render(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
        h(ServicingProvider, { children: h(HrMembersProvider, { children: h(ServicingTab) }) })),
    );
    expect(html.length).toBeGreaterThan(200);
    expect(hits(visibleText(html))).toEqual([]);
  });
  test('the check itself fails on a forbidden word', () => {
    expect(hits('สถานะ RENEWED · งาน P2')).toEqual(['RENEWED', 'P1/P2/P3']);
    expect(hits('รอ BOT รอบถัดไป · NEW · ลูกค้า EXISTING')).toEqual(['รอ BOT', 'EXISTING', 'NEW']);
    expect(hits('NEW_PROPERTY · RENEWAL')).toEqual([]);
  });
});
