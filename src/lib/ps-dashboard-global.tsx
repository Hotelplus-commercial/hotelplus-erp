import { createContext, useContext } from 'react';
import type { AssignmentFilter } from './ps-renewal';
import type { PsFilter, PsReportRow } from './ps-dashboard-types';

export type Period = { from: string; to: string };
export type GlobalFilter = PsFilter & AssignmentFilter & { search: string; hotelStatus: string; compare: boolean; periodA: Period; periodB: Period };
export const defaultGlobalFilter: GlobalFilter = { service: 'ALL', range: '6m', role: 'none', teams: [], people: [], search: '', hotelStatus: 'all', compare: false, periodA: { from: '2026-09-01', to: '2026-09-30' }, periodB: { from: '2026-08-01', to: '2026-08-31' } };
export const DashboardGlobal = createContext<{ filter: GlobalFilter; demo: boolean; now: string }>({ filter: defaultGlobalFilter, demo: false, now: '' });
export const useDashboardGlobal = () => useContext(DashboardGlobal);
export function monthPeriod(now: Date, offset = 0, span = 1): Period {
  return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset - span + 1, 1)).toISOString().slice(0, 10), to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0)).toISOString().slice(0, 10) };
}
export function selectedPeriod(f: GlobalFilter, now: Date, side: 'A' | 'B' = 'A'): Period {
  if (f.compare) return side === 'A' ? f.periodA : f.periodB;
  return f.range === 'all' ? { from: '0001-01-01', to: monthPeriod(now).to } : monthPeriod(now, side === 'B' ? -1 : 0, { mtd: 1, '3m': 3, '6m': 6, '12m': 12 }[f.range]);
}
export function periodRange(period: Period) { return { from: new Date(period.from).getTime(), to: new Date(period.to).getTime() + 864e5 }; }
export function matchesBook(row: PsReportRow, f: GlobalFilter, hotelLevel = false) {
  if (f.service !== 'ALL' && row.service_line !== f.service) return false;
  const owners = { AE: [row['ae_owner_id'], row['assigned_ae_id'], row['owner_ae']], ORM: [row['orm_team'], row['orm_owner_id'], row['assigned_service_owner_id'], row['orm_revenue_id'], row['orm_ecommerce_id']], Marcom: [row['marcom_owner_id'], row['marcom_id'], row['assigned_service_owner_id']] };
  const chosen = f.role === 'none' ? Object.values(owners).flat() : owners[f.role];
  const values = chosen.filter(v => v != null).map(String);
  if (f.role !== 'none' && !values.length) return false;
  if (f.teams.length && !f.teams.some(v => values.includes(v))) return false;
  if (f.people.length && !f.people.some(v => values.includes(v))) return false;
  if (hotelLevel && f.search.trim() && !`${row.hotel_name ?? ''} ${row.hotel_id ?? ''}`.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
  if (hotelLevel && f.hotelStatus !== 'all') {
    const expected = f.hotelStatus === 'active' ? 'ACTIVE' : f.hotelStatus === 'contract-end' ? 'INACTIVE' : f.hotelStatus.toUpperCase();
    if (String(row.status ?? '').toUpperCase() !== expected) return false;
  }
  return true;
}
export function scopePeriod(rows: PsReportRow[], f: GlobalFilter, period: Period, key = 'billing_period', hotelLevel = false) {
  return rows.filter(r => matchesBook(r, f, hotelLevel) && (key === 'none' || (r[key] != null && String(r[key]).slice(0,10) >= period.from && String(r[key]).slice(0,10) <= period.to)));
}
export function deltaText(a: number | null, b: number | null, unit: 'pp' | '%' | '' = '') {
  if (a == null || b == null) return 'Δ —';
  const diff = a - b;
  const value = unit === '%' ? (b === 0 ? null : diff / Math.abs(b) * 100) : diff;
  return value == null ? 'Δ —' : `Δ ${diff > 0 ? '▲ +' : diff < 0 ? '▼ ' : ''}${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })}${unit}`;
}