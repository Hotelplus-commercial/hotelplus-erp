/* Suite Sidebar R1 §2 — ONE registry for the 8 apps. The sidebar, the access guard (S10) and placeholder pages read only this.
 * Workspace entries come from WORKSPACES (workspace-registry.ts) and sit at position 2 of every app. Navigation only. */
import { workspaceByDept, sidebarEntryOf } from './workspace-registry';
import { ROLE_KEYS, type RoleKey } from './menu-role';

export type AppKey = 'BD' | 'PS' | 'ORM' | 'MARCOM' | 'AC' | 'HR' | 'AUTO' | 'OFFICE';
export type Scope = 'own' | 'all' | 'own_hotels' | 'all_hotels' | 'view';
export type Access = Partial<Record<RoleKey, Scope | true>>;
export type TabDef = { key: string; label: string; access?: RoleKey[] };

type Base = { key: string; label: string; access: Access };
export type SidebarItem =
  | (Base & { kind: 'page'; route: string; also?: string[]; exact?: boolean; tabs?: TabDef[]; r2?: boolean })
  | (Base & { kind: 'link_out'; target: { app: AppKey; route: string; mode?: 'drop_file' | 'view' } })
  | (Base & { kind: 'external'; url: string; fallback: string; purpose: string })
  | (Base & { kind: 'placeholder'; route: string; purpose: string; tabs?: TabDef[]; titleSuffix?: string })
  | (Base & { kind: 'report_issue'; route: string });
export type SidebarNode =
  | { kind: 'group'; label: string; children: (SidebarNode | SidebarItem)[] }
  | { kind: 'subheader'; label: string; children: SidebarItem[] }
  | SidebarItem;
export type AppDef = { key: AppKey; label: string; prefix: string; landing: Partial<Record<RoleKey, string>>; nodes: SidebarNode[] };

/* ---------- access builders ---------- */
const A = (...r: RoleKey[]): Access => Object.fromEntries(r.map((k) => [k, true]));
const S = (scope: Scope, ...r: RoleKey[]): Access => Object.fromEntries(r.map((k) => [k, scope]));
const M = (...a: Access[]): Access => Object.assign({}, ...a);
const EVERYONE = A(...ROLE_KEYS);

const P = (prefix: string, key: string, label: string, access: Access, purpose = 'อยู่ระหว่างพัฒนา', extra: { tabs?: TabDef[]; titleSuffix?: string } = {}): SidebarItem =>
  ({ kind: 'placeholder', key, label, route: `/${prefix}/${key}`, purpose, access, ...extra });
const B2 = (): TabDef[] => [{ key: 'b2c', label: 'B2C' }, { key: 'b2b', label: 'B2B' }];
const settings = (prefix: string, access: Access) => P(prefix, 'settings', 'ตั้งค่า', access, 'ตั้งค่าของแอป');
const issue = (prefix: string, access: Access): SidebarItem => ({ kind: 'report_issue', key: 'report-issue', label: 'แจ้งปัญหา', route: `/${prefix}/report-issue`, access });
const ws = (dept: Parameters<typeof workspaceByDept>[0], access: Access, also: string[] = []): SidebarItem => {
  const e = sidebarEntryOf(workspaceByDept(dept));
  return { kind: 'page', key: 'workspace', label: 'Workspace', route: e.path, also, access };
};
const MA = 'วิเคราะห์การประชุม';
const PAY = 'ยอดผลตอบแทนรายรอบ';
/** R2 A: Production Report lives once, in AC App. */
export const PROD_REPORT = '/ac/production-report';
/** PR-O1 PR-Q1: Report Automation (placeholder until its spec). */
export const REPORT_AUTOMATION = '/ps/report-automation';
const REPORT_AUTOMATION_PURPOSE = 'รวมรายงานรายเดือนที่ส่งให้ลูกค้า (ORM Snapshot · Marcom Sync Up) สำหรับ AE';

/* ---------- BD APP ---------- */
const BD_ALL = A('TM', 'BD', 'BDM', 'HOC', 'MD');
const bd: AppDef = {
  key: 'BD', label: 'BD APP', prefix: 'bd',
  landing: { TM: '/bd/dashboard', BD: '/bd/dashboard', BDM: '/bd/dashboard', HOC: '/bd/dashboard', MD: '/bd/dashboard', AUTO: '/bd/pulse' },
  nodes: [
    // Patch B DB3: real page (was placeholder).
    { kind: 'page', key: 'dashboard', label: 'Dashboard', route: '/bd/dashboard', access: BD_ALL, tabs: [{ key: 'tm', label: 'TM Dashboard', access: ['TM', 'BDM', 'HOC', 'MD'] }, { key: 'bd', label: 'BD Dashboard', access: ['BD', 'BDM', 'HOC', 'MD'] }] },
    ws('BD', M(S('own', 'TM', 'BD'), S('all', 'BDM', 'HOC', 'MD'))),
    { kind: 'group', label: 'หาลูกค้า (Prospect)', children: [
      P('bd', 'pulse', 'Pulse', A('AUTO', 'HOC', 'MD')),
      P('bd', 'lead-tracker', 'Lead Tracker', BD_ALL, 'ติดตาม lead ทุก source · สถานะจาก PipeDrive'),
      P('bd', 'call-script', 'Call Script', A('TM', 'BDM', 'HOC', 'MD'), 'บทพูดของ TM ตามชุดและประเภท lead'),
    ] },
    { kind: 'group', label: 'ประชุม & เสนอราคา (Pitch)', children: [
      { kind: 'page', key: 'demand-calendar', label: 'Demand Calendar', route: '/bd/demand-calendar', access: A('BD', 'BDM', 'HOC', 'MD') },
      { kind: 'page', key: 'adr-calculator', label: 'ADR Calculator', route: '/bd/adr-calculator', access: A('BD', 'BDM', 'HOC', 'MD') },
      { kind: 'page', key: 'package-calculator', label: 'Package Calculator', route: '/bd/package-calculator', also: ['/bd/calculator'], access: A('BD', 'BDM', 'HOC', 'MD') },
      { kind: 'page', key: 'quotation', label: 'ใบเสนอราคา', route: '/bd/quotation', access: A('BD', 'BDM', 'HOC', 'MD') },
      { kind: 'link_out', key: 'contract-dashboard', label: 'Contract Dashboard', target: { app: 'PS', route: '/ps/contract-dashboard' }, access: A('BD', 'BDM', 'HOC', 'MD') },
    ] },
    { kind: 'group', label: 'ผลงานของฉัน', children: [
      { kind: 'subheader', label: 'Calling', children: [P('bd', 'call-monitor', 'Call Monitor', M(S('own', 'TM'), S('all', 'BDM', 'HOC', 'MD')), 'สายโทรออกและรับสายจาก DTAC OneCall เทียบเป้า')] },
      { kind: 'subheader', label: 'Pitching', children: [P('bd', 'meeting-analyzer', 'Meeting Analyzer', M(S('own', 'BD'), S('all', 'BDM', 'HOC', 'MD')))] },
      { kind: 'subheader', label: 'KPI', children: [P('bd', 'my-kpi', 'My KPI', M(S('own', 'TM', 'BD'), S('all', 'BDM', 'HOC', 'MD')), 'ผลงานของฉันเทียบ KPI บริษัท')] },
    ] },
    settings('bd', A('BDM', 'HOC')),
    issue('bd', EVERYONE),
  ],
};

/* ---------- PS App ---------- */
const PS_ALL = A('PM', 'AE', 'OBS', 'HOC', 'MD');
const ps: AppDef = {
  key: 'PS', label: 'PS App', prefix: 'ps',
  landing: Object.fromEntries(ROLE_KEYS.map((r) => [r, '/ps'])),
  nodes: [
    { kind: 'page', key: 'dashboard', label: 'PS Dashboard', route: '/ps', exact: true, access: PS_ALL },
    ws('PS', M(S('own', 'AE', 'OBS'), S('all', 'PM', 'HOC', 'MD')), ['/workspace/ps', '/ps/ae-workspace', '/workspace/ae']),
    { kind: 'group', label: 'วงจรสัญญา', children: [
      { kind: 'page', key: 'contract-dashboard', label: 'Contract Dashboard', route: '/ps/contract-dashboard', also: ['/ps/contract-wizard'], access: A('BD', 'BDM', 'PM', 'AE', 'HOC', 'MD') },
      { kind: 'page', key: 'onboard', label: 'On-board', route: '/ps/onboarding-process', access: PS_ALL },
      { kind: 'page', key: 'contracts', label: 'Contract & Service Manager', route: '/ps/contracts', access: M(A('PM', 'HOC', 'MD'), S('view', 'AE', 'OBS')) },
      P('ps', 'upsell', 'Upsell', A('PM', 'AE', 'HOC', 'MD'), 'ติดตาม upsell ของทีมบริการ'),
      P('ps', 'off-board', 'Off-board', A('PM', 'AE', 'HOC', 'MD'), 'การ์ดโรงแรมที่ไม่ต่อสัญญาหรือถูกยกเลิก'),
      { kind: 'page', key: 'property', label: 'Property Content', route: '/ps/property-content', access: PS_ALL },
    ] },
    { kind: 'group', label: 'ดูแลลูกค้ารายเดือน', children: [
      // PR-O1 PR-Q1: Snapshot (ORM) / Sync Up (Marcom) link-outs land here; ORM / MKT roles reach it only through those links.
      P('ps', 'report-automation', 'Report Automation', A('AE', 'PM', 'OBS', 'HOC', 'MD', 'ORM', 'ORM_LEAD', 'GRM', 'MKT', 'MKT_LEAD'), REPORT_AUTOMATION_PURPOSE),
    ] },
    { kind: 'group', label: 'ผลงานของฉัน', children: [
      { kind: 'subheader', label: 'KPI', children: [P('ps', 'my-kpi', 'My KPI', M(S('own', 'AE', 'OBS'), S('all', 'PM', 'HOC', 'MD')), 'ผลงานของฉันเทียบ KPI บริษัท')] },
    ] },
    { kind: 'page', key: 'settings', label: 'ตั้งค่า', route: '/ps/settings', also: ['/ps/templates'], access: A('PM', 'HOC', 'MD', 'AUTO') },
    // Kept so PM still reaches SLA On-board (user condition: no page a role uses today may become unreachable).
    { kind: 'page', key: 'sla-onboard', label: 'SLA On-board', route: '/ps/settings/sla-onboard', access: A('PM', 'HOC', 'MD') },
    issue('ps', EVERYONE),
  ],
};

/* ---------- ORM App ---------- */
const ORM_T = A('ORM', 'ORM_LEAD', 'GRM', 'HOC', 'MD');
const ORM_OWN = M(S('own', 'ORM'), S('all', 'ORM_LEAD', 'GRM', 'HOC', 'MD'));
const ORM_HOT = M(S('own_hotels', 'ORM'), S('all_hotels', 'ORM_LEAD', 'GRM', 'HOC', 'MD'));
const orm: AppDef = {
  key: 'ORM', label: 'ORM App', prefix: 'orm',
  landing: Object.fromEntries(ROLE_KEYS.map((r) => [r, '/orm/dashboard'])),
  nodes: [
    { kind: 'page', key: 'dashboard', label: 'ORM Dashboard', route: '/orm/dashboard', access: A('ORM', 'ORM_LEAD', 'GRM', 'PM', 'HOC', 'MD') },
    ws('ORM', ORM_OWN),
    { kind: 'group', label: 'ให้บริการ (Service Operations)', children: [
      { kind: 'link_out', key: 'property', label: 'Property Content', target: { app: 'PS', route: '/ps/property-content' }, access: ORM_T },
      P('orm', 'revplus', 'RevPlus+', ORM_HOT),
      P('orm', 'rate-structure', 'Rate Structure', ORM_HOT),
      P('orm', 'rate-shopper', 'Rate Shopper', ORM_HOT),
      { kind: 'page', key: 'action-a', label: 'Action A', route: '/orm/action-a', access: ORM_HOT },
      P('orm', 'revplus-meeting-analyzer', 'RevPlus+ / Rate Structure Meeting Analyzer', ORM_OWN, MA),
    ] },
    { kind: 'group', label: 'ส่งงานรายเดือน (Monthly Delivery)', children: [
      // PR-O1 PR-Q1: Snapshot Report goes to PS App › Report Automation (old /orm/snapshot-report redirects there).
      { kind: 'link_out', key: 'snapshot-report', label: 'Snapshot Report', target: { app: 'PS', route: REPORT_AUTOMATION }, access: ORM_HOT },
      { kind: 'link_out', key: 'production-report', label: 'Production Report', target: { app: 'AC', route: PROD_REPORT, mode: 'drop_file' }, access: ORM_HOT },
      P('orm', 'snapshot-meeting-analyzer', 'Snapshot Meeting Analyzer', ORM_OWN, MA),
    ] },
    { kind: 'group', label: 'Revenue', children: [
      P('orm', 'revmax', 'RevMax', ORM_T),
      P('orm', 'revmax-meeting-analyzer', 'RevMax Meeting Analyzer', ORM_OWN, MA),
      // R2 B: Tier page moved from The Office APP (old ORM Bonus) — view-only page, one copy.
      { kind: 'page', key: 'orm-tier', label: 'ORM Tier', route: '/orm/orm-tier', also: ['/the-office-app/orm-bonus'], access: ORM_T },
    ] },
    { kind: 'group', label: 'ผลงานของฉัน', children: [
      { kind: 'subheader', label: 'KPI', children: [
        P('orm', 'orm-funding', 'ORM Funding', ORM_OWN, 'ยอดชดเชยลูกค้าที่กระทบผลงาน'),
        P('orm', 'my-kpi', 'My KPI', ORM_OWN, 'ผลงานของฉันเทียบ KPI บริษัท'),
      ] },
    ] },
    settings('orm', A('GRM', 'HOC', 'MD')),
    issue('orm', EVERYONE),
  ],
};

/* ---------- Marcom App ---------- */
const MK_T = A('MKT', 'MKT_LEAD', 'HOC', 'MD');
const MK_OWN = M(S('own', 'MKT'), S('all', 'MKT_LEAD', 'HOC', 'MD'));
const MK_HOT = M(S('own_hotels', 'MKT'), A('MKT_LEAD', 'HOC', 'MD'));
const marcom: AppDef = {
  key: 'MARCOM', label: 'Marcom App', prefix: 'marcom',
  landing: Object.fromEntries(ROLE_KEYS.map((r) => [r, '/marcom/dashboard'])),
  nodes: [
    { kind: 'page', key: 'dashboard', label: 'Marcom Dashboard', route: '/marcom/dashboard', access: A('MKT', 'MKT_LEAD', 'PM', 'HOC', 'MD') },
    ws('MARCOM', MK_OWN),
    { kind: 'group', label: 'ให้บริการ (Service Operations)', children: [
      { kind: 'link_out', key: 'property', label: 'Property Content', target: { app: 'PS', route: '/ps/property-content' }, access: MK_T },
      P('marcom', 'socialplus-meeting-analyzer', 'SocialPlus+ Meeting Analyzer', MK_OWN, MA),
      P('marcom', 'content-plan', 'Content Plan', MK_T, undefined, { tabs: B2() }),
      P('marcom', 'adscan', 'ADSCAN', MK_T, undefined, { tabs: B2() }),
      P('marcom', 'kol-tracker', 'KOL Tracker', MK_T, undefined, { tabs: B2() }),
      P('marcom', 'first-sync-up-meeting-analyzer', 'First Sync Up Meeting Analyzer', MK_OWN, MA),
      P('marcom', 'upsell-management', 'Upsell Management', MK_HOT, 'ดำเนินการ upsell · ส่งเรื่องให้ PS ยืนยัน'),
    ] },
    { kind: 'group', label: 'ส่งงานรายเดือน (Monthly Delivery)', children: [
      { kind: 'link_out', key: 'sync-up-report', label: 'Sync Up Report', target: { app: 'PS', route: REPORT_AUTOMATION }, access: MK_HOT },
      { kind: 'link_out', key: 'production-report', label: 'Production Report', target: { app: 'AC', route: PROD_REPORT, mode: 'drop_file' }, access: MK_HOT },
      P('marcom', 'graphic-summary', 'สรุปชิ้นงานกราฟฟิก', MK_HOT, 'สรุปจำนวนชิ้นงานจาก Content Plan · ยืนยันก่อนส่ง AC'),
      P('marcom', 'sync-up-meeting-analyzer', 'Sync Up Meeting Analyzer', MK_OWN, MA),
    ] },
    { kind: 'group', label: 'Weekly Meeting', children: [
      { kind: 'subheader', label: 'B2C', children: [
        { kind: 'external', key: 'looker-studio', label: 'Looker Studio', url: LOOKER_STUDIO_URL(), fallback: '/marcom/looker-studio', purpose: 'อยู่ระหว่างพัฒนา', access: MK_T },
      ] },
    ] },
    { kind: 'group', label: 'ผลงานของฉัน', children: [
      { kind: 'subheader', label: 'KPI', children: [P('marcom', 'my-kpi', 'My KPI', MK_OWN, 'ผลงานของฉันเทียบ KPI บริษัท')] },
    ] },
    settings('marcom', A('MKT_LEAD', 'HOC', 'MD')),
    issue('marcom', EVERYONE),
  ],
};
/** Looker Studio URL from config; empty → the placeholder page opens. */
function LOOKER_STUDIO_URL(): string { return ''; }

/* ---------- AC App ---------- */
const AC_T = A('AC', 'HOC', 'MD');
const ac: AppDef = {
  key: 'AC', label: 'AC App', prefix: 'ac',
  landing: { AC: '/ac/dashboard', AC_LEAD: '/ac/dashboard', HOC: '/ac/dashboard', MD: '/ac/dashboard', PM: '/ac/hotel-profile' },
  nodes: [
    { kind: 'page', key: 'dashboard', label: 'AC Dashboard', route: '/ac/dashboard', access: A('AC', 'AC_LEAD', 'HOC', 'MD') }, // Patch B DB6
    ws('AC', M(S('own', 'AC'), S('all', 'AC_LEAD', 'HOC', 'MD'))),
    { kind: 'group', label: 'ข้อมูลหลัก (Master)', children: [
      { kind: 'subheader', label: 'ลูกค้า', children: [
        { kind: 'page', key: 'hotel-profile', label: 'Hotel Profile', route: '/ac/hotel-profile', access: A('AC', 'PM', 'HOC', 'MD') },
        { kind: 'page', key: 'customers', label: 'Customer Profile', route: '/ac/customers', access: AC_T },
      ] },
      { kind: 'subheader', label: 'Product', children: [
        { kind: 'page', key: 'products', label: 'Product Catalog', route: '/ac/products', access: AC_T },
      ] },
    ] },
    { kind: 'group', label: 'วางบิล & รับเงิน (Receivables)', children: [
      // R2 A.1: Production Report moved from PS App; item 1 of Receivables. ORM / MKT reach it only via ↗ (drop mode).
      { kind: 'page', key: 'production-report', label: 'Production Report', route: PROD_REPORT, also: ['/ps/production'], access: AC_T },
      { kind: 'page', key: 'billing', label: 'AC Billing', route: '/ac/billing', also: ['/ac/operations'], access: AC_T },
      P('ac', 'collection', 'ติดตามหนี้', AC_T),
    ] },
    { kind: 'group', label: 'ทำจ่าย (Payables)', children: [
      { kind: 'subheader', label: 'Vendor', children: [
        { kind: 'page', key: 'partner-bills', label: 'บิล Partner', route: '/ac/partner-bills', access: AC_T },
        // User answer (c): existing ต้นทุนค่าระบบ sits next to บิล Partner.
        { kind: 'page', key: 'system-cost', label: 'ต้นทุนค่าระบบ', route: '/ac/system-cost', access: AC_T },
        P('ac', 'kol-bills', 'บิลค่า KOL', AC_T, 'บันทึกและทำจ่ายบิล'),
        P('ac', 'misc-bills', 'บิลเบ็ดเตล็ด', AC_T, 'บันทึกและทำจ่ายบิล'),
      ] },
      { kind: 'subheader', label: 'Commission & Incentive', children: [
        P('ac', 'bd-commission', 'BD Commission', AC_T, PAY, { titleSuffix: 'ทำจ่าย' }),
        P('ac', 'ps-incentive', 'PS Incentive', AC_T, PAY, { titleSuffix: 'ทำจ่าย' }),
        P('ac', 'orm-bonus', 'ORM Bonus', AC_T, PAY, { titleSuffix: 'ทำจ่าย' }),
        P('ac', 'marcom-standard-line', 'Marcom Standard Line', AC_T, PAY, { titleSuffix: 'ทำจ่าย' }),
      ] },
      // Patch A SP2: last Payables item, before รายงาน.
      P('ac', 'payroll', 'Payroll', AC_T, 'ทำจ่ายเงินเดือนพนักงาน · ข้อมูลจาก HR App'),
    ] },
    { kind: 'group', label: 'รายงาน', children: [P('ac', 'pnl', 'P&L', A('AC_LEAD', 'HOC', 'MD'), 'รายงาน P&L สำหรับประชุมผู้บริหาร')] },
    settings('ac', A('AC_LEAD', 'HOC')),
    issue('ac', EVERYONE),
  ],
};

/* ---------- HR App ---------- */
const HR_T = A('HR', 'HOC', 'MD');
const STAFF = 'ข้อมูลสำหรับพนักงานทุกคน';
const HEADS = A('AC_LEAD', 'ORM_LEAD', 'MKT_LEAD', 'GRM', 'BDM', 'OGM', 'PM');
const hr: AppDef = {
  key: 'HR', label: 'HR App', prefix: 'hr',
  landing: { ...Object.fromEntries(ROLE_KEYS.map((r) => [r, '/hr/announcements'])), HR: '/hr', HOC: '/hr', MD: '/hr' },
  nodes: [
    // User answer (b): HR Overview /hr is the HR Dashboard page until the new one is built.
    { kind: 'page', key: 'dashboard', label: 'HR Dashboard', route: '/hr', exact: true, access: HR_T },
    ws('HR', M(S('own', 'HR'), S('all', 'HOC', 'MD'))),
    { kind: 'group', label: 'ศูนย์พนักงาน', children: [
      P('hr', 'announcements', 'ประกาศบริษัท', EVERYONE, STAFF),
      P('hr', 'handbook', 'คู่มือการทำงาน', EVERYONE, STAFF),
      P('hr', 'org-chart', 'แผนผังองค์กร', EVERYONE, STAFF),
      P('hr', 'my-documents', 'เอกสารของฉัน', S('own', ...ROLE_KEYS), STAFF),
    ] },
    P('hr', 'onboarding', 'รับพนักงานใหม่', M(HR_T, HEADS), 'การ์ดราย คน: เปิดรับ → สัมภาษณ์ → จ้างงาน → Orientation → ทดลองงาน'),
    { kind: 'group', label: 'บุคลากร', children: [
      { kind: 'page', key: 'members', label: 'Members', route: '/hr/members', access: M(A('HR'), S('view', 'HOC', 'MD')) },
      P('hr', 'roster', 'Roster', M(A('HR'), S('view', 'HOC', 'MD')), 'ทีม · หน้าที่ · หัวหน้าทีม'),
      P('hr', 'kpi', 'KPI รายบุคคล', HR_T, 'KPI ของพนักงานแต่ละคน'),
    ] },
    { kind: 'group', label: 'Commission & Incentive', children: [
      P('hr', 'bd-commission', 'BD Commission', HR_T, PAY, { titleSuffix: 'คำนวณ' }),
      P('hr', 'ps-incentive', 'PS Incentive', HR_T, PAY, { titleSuffix: 'คำนวณ' }),
      P('hr', 'orm-bonus', 'ORM Bonus', HR_T, PAY, { titleSuffix: 'คำนวณ' }),
      P('hr', 'marcom-standard-line', 'Marcom Standard Line', HR_T, PAY, { titleSuffix: 'คำนวณ' }),
    ] },
    P('hr', 'offboarding', 'Offboarding', M(HR_T, HEADS), 'การ์ดพ้นสภาพ: แจ้งลาออก → ส่งต่องาน → ปิดสิทธิ์ → เอกสาร'),
    settings('hr', HR_T),
    issue('hr', EVERYONE),
  ],
};

/* ---------- AUTO APP ---------- */
const AU_T = A('AUTO', 'OGM', 'HOC', 'MD');
const auto: AppDef = {
  key: 'AUTO', label: 'AUTO APP', prefix: 'automation',
  landing: Object.fromEntries(ROLE_KEYS.map((r) => [r, '/automation/dashboard'])),
  nodes: [
    { kind: 'page', key: 'dashboard', label: 'AUTO Dashboard', route: '/automation/dashboard', access: AU_T }, // Patch B DB8
    ws('AUTO', M(S('own', 'AUTO', 'OGM'), S('all', 'HOC', 'MD'))),
    { kind: 'group', label: 'Monitor', children: [
      P('automation', 'automation', 'Automation', AU_T, 'Monitor'),
      P('automation', 'tools', 'Tools', AU_T, 'Monitor'),
      P('automation', 'bugs-errors', 'Bugs & Errors', AU_T, 'Monitor'),
      P('automation', 'upgrade', 'Upgrade', AU_T, 'Monitor'),
    ] },
    P('automation', 'project-pipeline', 'Project Pipeline', AU_T, 'Requirement → TOR → Spec → อนุมัติ → Build → UAT → Launch'),
    P('automation', 'tool-catalog', 'Tool Catalog', AU_T, 'ศูนย์รวม tools ทุกแอป'),
    settings('automation', A('AUTO', 'HOC', 'MD')),
    issue('automation', EVERYONE),
  ],
};

/* ---------- The Office APP ---------- */
const office: AppDef = {
  key: 'OFFICE', label: 'The Office APP', prefix: 'the-office-app',
  landing: { HOC: '/the-office-app/dashboard', MD: '/the-office-app/dashboard', HOD: '/the-office-app/hod-meeting-minutes', HR: '/the-office-app/hod-meeting-minutes' },
  nodes: [
    // R2 C: BD-AC is tab 1 of The Office Dashboard (old BD-AC addresses forward here).
    { kind: 'page', key: 'dashboard', label: 'The Office Dashboard', route: '/the-office-app/dashboard', also: ['/the-office-app/bd-ac', '/office/bd-ac'], tabs: [{ key: 'bd-ac', label: 'BD-AC' }, { key: 'renewal-offer', label: 'ข้อเสนอต่อสัญญา' }], access: A('HOC', 'MD') },
    ws('OFFICE', M(S('own', 'HOC'), S('all', 'MD'))),
    { kind: 'group', label: 'รายงานผู้บริหาร', children: [
      { kind: 'link_out', key: 'pnl', label: 'P&L', target: { app: 'AC', route: '/ac/pnl' }, access: A('HOC', 'MD') },
      P('the-office-app', 'hod-meeting-minutes', 'HOD Meeting Minutes', M(A('HOC', 'MD'), S('view', 'HOD', 'HR')), 'บันทึกการประชุม HOD และมติ'),
    ] },
  ],
};

/** §3.2 suite order. */
export const SIDEBAR_REGISTRY: AppDef[] = [bd, ps, orm, marcom, ac, hr, auto, office];

/** User answer (d): Suite area above the apps, visible to every role. */
export const SUITE_ITEMS = [
  { key: 'overview', label: 'Overview Dashboard', route: '/' },
  { key: 'configuration', label: 'Configuration', route: '/settings' },
] as const;

/* ---------- selectors (pure) ---------- */
const isItem = (n: SidebarNode | SidebarItem): n is SidebarItem => n.kind !== 'group' && n.kind !== 'subheader';
export function itemsOf(app: AppDef): SidebarItem[] {
  const out: SidebarItem[] = [];
  const walk = (ns: (SidebarNode | SidebarItem)[]) => ns.forEach((n) => (isItem(n) ? out.push(n) : walk(n.children)));
  walk(app.nodes);
  return out;
}
export const allItems = () => SIDEBAR_REGISTRY.flatMap((a) => itemsOf(a).map((item) => ({ app: a, item })));
export const has = (acc: Access, r: RoleKey) => acc[r] !== undefined;

/** Routes an item opens (page / placeholder / report-issue / external fallback). Link-outs open their target. */
export function routesOf(i: SidebarItem): { path: string; exact: boolean }[] {
  if (i.kind === 'page') return [{ path: i.route, exact: !!i.exact }, ...(i.also ?? []).map((p) => ({ path: p, exact: false }))];
  if (i.kind === 'placeholder' || i.kind === 'report_issue') return [{ path: i.route, exact: true }];
  if (i.kind === 'external') return [{ path: i.fallback, exact: true }];
  return [];
}
const matches = (pathname: string, r: { path: string; exact: boolean }) => pathname === r.path || (!r.exact && pathname.startsWith(`${r.path}/`));
export const linkOutHref = (i: Extract<SidebarItem, { kind: 'link_out' }>) => i.target.route;

/** S7 / §6: a link-out grants its roles the target page (the page itself lives once in its owner app). */
export function effectiveAccess(route: string, base: Access): Access {
  const extra = allItems().filter(({ item }) => item.kind === 'link_out' && item.target.route === route).map(({ item }) => item.access);
  return M(base, ...extra);
}
export function itemVisible(i: SidebarItem, r: RoleKey): boolean {
  if (i.kind === 'page') return has(effectiveAccess(i.route, i.access), r) && has(i.access, r);
  return has(i.access, r);
}
/** S6: hidden (never locked); empty groups / sub-headers hidden. */
export function visibleNodes(nodes: (SidebarNode | SidebarItem)[], r: RoleKey): (SidebarNode | SidebarItem)[] {
  const out: (SidebarNode | SidebarItem)[] = [];
  for (const n of nodes) {
    if (isItem(n)) { if (itemVisible(n, r)) out.push(n); continue; }
    const kids = visibleNodes(n.children, r);
    if (kids.some((k) => k.kind !== 'report_issue')) out.push({ ...n, children: kids } as SidebarNode);
  }
  return out;
}
/** S8: app hidden when the role has no visible item other than แจ้งปัญหา. */
export const appVisible = (a: AppDef, r: RoleKey) => itemsOf(a).some((i) => i.kind !== 'report_issue' && itemVisible(i, r));
export const visibleApps = (r: RoleKey) => SIDEBAR_REGISTRY.filter((a) => appVisible(a, r));

/** S1: landing of an app for a role (configured → else first visible page). Null = app hidden. */
export function landingOf(a: AppDef, r: RoleKey): string | null {
  if (!appVisible(a, r)) return null;
  const conf = a.landing[r];
  if (conf && canOpen(conf, r) !== false) return conf;
  const first = itemsOf(a).find((i) => i.kind !== 'link_out' && i.kind !== 'report_issue' && itemVisible(i, r));
  return first ? routesOf(first)[0]?.path ?? null : null;
}

/** Most specific registry match for a pathname (longest route). */
export function matchRoute(pathname: string): { app: AppDef; item: SidebarItem; path: string } | null {
  let best: { app: AppDef; item: SidebarItem; path: string } | null = null;
  for (const { app, item } of allItems()) for (const r of routesOf(item)) if (matches(pathname, r) && (!best || r.path.length > best.path.length)) best = { app, item, path: r.path };
  return best;
}
/** App a pathname belongs to (registry match, else prefix). */
export function appOfPath(pathname: string): AppDef | null {
  const m = matchRoute(pathname);
  if (m) return m.app;
  return SIDEBAR_REGISTRY.find((a) => pathname === `/${a.prefix}` || pathname.startsWith(`/${a.prefix}/`)) ?? null;
}
/** true = allowed · false = hidden for role · null = not in registry (existing unmapped page → stays reachable). */
export function canOpen(pathname: string, r: RoleKey): boolean | null {
  const m = matchRoute(pathname);
  if (!m) return null;
  const base = m.item.kind === 'page' ? effectiveAccess(m.item.route, m.item.access) : m.item.access;
  return has(base, r);
}
/** S10: where a hidden route goes (app landing for the role, else first visible app). Null = stay. */
export function guardTarget(pathname: string, r: RoleKey): string | null {
  if (canOpen(pathname, r) !== false) return null;
  const app = appOfPath(pathname);
  return (app && landingOf(app, r)) || visibleApps(r).map((a) => landingOf(a, r)).find(Boolean) || '/';
}
/** S10 redirects keep DEMO: ?demo=1 in the URL or the shared DEMO switch on → target carries ?demo=1. */
export function withDemo(target: string, searchStr: string, sharedDemo: boolean, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  const cur = new URLSearchParams(searchStr);
  if (cur.get('demo') === '1' || sharedDemo) q.set('demo', '1');
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const s = q.toString();
  return s ? `${target}?${s}` : target;
}
/** Placeholder / report-issue item for a pathname (used by the shared placeholder page). */
export function placeholderAt(pathname: string): { app: AppDef; item: SidebarItem; group: string } | null {
  for (const app of SIDEBAR_REGISTRY) {
    const walk = (ns: (SidebarNode | SidebarItem)[], g: string): { app: AppDef; item: SidebarItem; group: string } | null => {
      for (const n of ns) {
        if (isItem(n)) { if ((n.kind === 'placeholder' || n.kind === 'report_issue') && n.route === pathname) return { app, item: n, group: g }; if (n.kind === 'external' && n.fallback === pathname) return { app, item: n, group: g }; continue; }
        const f = walk(n.children, g ? `${g} · ${n.label}` : n.label); if (f) return f;
      }
      return null;
    };
    const f = walk(app.nodes, ''); if (f) return f;
  }
  return null;
}
