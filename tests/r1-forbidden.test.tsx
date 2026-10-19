/* R1.1 §4 — render dashboard tabs in demo mode and fail on any forbidden display string. */
import { describe, expect, test } from 'bun:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PsReportTab } from '../src/components/ps/ps-report-tab';
import { MeetingAnalyzerTab } from '../src/components/ps/meeting-analyzer-tab';
import { Account360Provider } from '../src/components/ps/account-360';
import { DashboardGlobal, defaultGlobalFilter, selectedPeriod } from '../src/lib/ps-dashboard-global';
import { buildDemoReport, DEMO_NOW } from '../src/lib/ps-demo-fixture';
import { demoMeetingReport, MEETING_DEMO_NOW } from '../src/lib/meeting-dashboard-demo';

const FORBIDDEN = ['SERVICING_STALL', 'CONTRACT_FOLLOWUP', 'UPSELL_PITCH', 'RENEWAL_DUE', 'GRADE_RISK', 'SURVEY_LOW', 'ASSIGNMENT_PENDING', 'RENEWED', 'NOT_RENEWED', 'IN_PROGRESS', 'LOST', 'NPS', 'row-1', '★', 'เพดาน', 'เคส PS', 'Ticket ระบบ', 'HTL-'];
const visibleText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function hits(text: string) {
  const found = FORBIDDEN.filter((w) => text.includes(w));
  if (/(^|[^A-Za-z0-9])P[123](?![A-Za-z0-9])/.test(text)) found.push('P1/P2/P3');
  return found;
}

describe('R1.1 forbidden strings (demo mode)', () => {
  test('Tab PS', () => {
    const report = buildDemoReport(defaultGlobalFilter);
    const now = new Date(DEMO_NOW);
    const html = renderToStaticMarkup(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: DEMO_NOW } },
        h(Account360Provider, { report, children: h(PsReportTab, { report, filter: { ...defaultGlobalFilter, period: selectedPeriod(defaultGlobalFilter, now) }, loading: false, error: false }) })),
    );
    expect(html.length).toBeGreaterThan(1000);
    expect(hits(visibleText(html))).toEqual([]);
  });
  test('Meeting & Survey', () => {
    const html = renderToStaticMarkup(
      h(DashboardGlobal.Provider, { value: { filter: defaultGlobalFilter, demo: true, now: String(MEETING_DEMO_NOW) } },
        h(MeetingAnalyzerTab, { report: demoMeetingReport(), loading: false, error: false })),
    );
    expect(html.length).toBeGreaterThan(1000);
    expect(hits(visibleText(html))).toEqual([]);
  });
});
