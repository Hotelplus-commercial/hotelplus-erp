/* Workspace Platform Layer 1 (spec v1.0): config-driven registry. The shell renders ONLY from these rows.
 * Adding a workspace = add a row here; no shell edits. ⏰/✅ adapters are defined but NOT wired. */
import type { Dept } from './tickets-l0';

export type AppHost = 'BD_APP' | 'AC_APP' | 'PS_APP' | 'ORM_APP' | 'MARCOM_APP' | 'HR_APP' | 'AUTO_APP' | 'OFFICE_APP';
export type DateRange = 'today' | '7d' | '14d';

export type ScheduledItem = { id: string; datetime: string; title: string; subtitle?: string; route_target: string };
/** Own-only, sorted by time, within range. Not called anywhere in this build. */
export type ScheduledAdapter = (q: { person: string; range: DateRange }) => ScheduledItem[];
export type TodoItem = { id: string; title: string; due_relative: string; route_target: string };
export type TodoTypeGroup = { key: string; icon: string; label_th: string } & (
  | { assignment_scope: 'ORM' | 'MARCOM'; adapter?: never }
  | { assignment_scope?: never; adapter: (q: { person: string; range: DateRange }) => TodoItem[] }
);

export type WorkspaceConfig = {
  dept_key: Dept;
  label: string;
  app_host: AppHost;
  sidebar_order: number;
  ticket_target_dept: Dept;
  /** Route path of this workspace. BD keeps its L0 URL. */
  path: string;
  lanes: { scheduled: ScheduledAdapter | null; todo: TodoTypeGroup[]; tickets: { enabled: true; default_filter: 'open' } };
};

const lanes = () => ({ scheduled: null, todo: [] as TodoTypeGroup[], tickets: { enabled: true as const, default_filter: 'open' as const } });
const assignmentLanes = (scope: 'ORM' | 'MARCOM') => ({ ...lanes(), todo: [{ key: 'ASSIGNMENT_PENDING', icon: '⚠', label_th: 'รอระบุผู้ดูแล', assignment_scope: scope }] });

export const WORKSPACES: WorkspaceConfig[] = [
  { dept_key: 'BD', label: 'BD Workspace', app_host: 'BD_APP', sidebar_order: 90, ticket_target_dept: 'BD', path: '/bd/tickets', lanes: lanes() },
  { dept_key: 'AC', label: 'AC Workspace', app_host: 'AC_APP', sidebar_order: 90, ticket_target_dept: 'AC', path: '/workspace/ac', lanes: lanes() },
  { dept_key: 'PS', label: 'PM Workspace', app_host: 'PS_APP', sidebar_order: 50, ticket_target_dept: 'PS', path: '/workspace/ps', lanes: lanes() },
  { dept_key: 'ORM', label: 'ORM Workspace', app_host: 'ORM_APP', sidebar_order: 90, ticket_target_dept: 'ORM', path: '/workspace/orm', lanes: assignmentLanes('ORM') },
  { dept_key: 'MARCOM', label: 'Marcom Workspace', app_host: 'MARCOM_APP', sidebar_order: 90, ticket_target_dept: 'MARCOM', path: '/workspace/marcom', lanes: assignmentLanes('MARCOM') },
  { dept_key: 'HR', label: 'HR Workspace', app_host: 'HR_APP', sidebar_order: 90, ticket_target_dept: 'HR', path: '/workspace/hr', lanes: lanes() },
  { dept_key: 'AUTO', label: 'AUTO Workspace', app_host: 'AUTO_APP', sidebar_order: 90, ticket_target_dept: 'AUTO', path: '/workspace/auto', lanes: lanes() },
  { dept_key: 'OFFICE', label: 'The Office Workspace', app_host: 'OFFICE_APP', sidebar_order: 90, ticket_target_dept: 'OFFICE', path: '/workspace/office', lanes: lanes() },
];

export const workspaceBySlug = (slug: string) => WORKSPACES.find((w) => w.path === `/workspace/${slug}`);
export const workspaceByDept = (d: Dept) => WORKSPACES.find((w) => w.ticket_target_dept === d)!;
/** Sidebar module slug → app host. */
export const HOST_OF_MODULE: Record<string, AppHost> = { bd: 'BD_APP', ac: 'AC_APP', ps: 'PS_APP', orm: 'ORM_APP', marcom: 'MARCOM_APP', hr: 'HR_APP', automation: 'AUTO_APP' };
export const workspacesFor = (host: AppHost) => WORKSPACES.filter((w) => w.app_host === host);
