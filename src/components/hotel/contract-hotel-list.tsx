import { useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DashboardGlobal, defaultGlobalFilter } from '@/lib/ps-dashboard-global';
import { DEMO_NOW } from '@/lib/ps-demo-fixture';
import { PsDashboard } from './ps-dashboard';

export function ContractHotelList() {
  const location = useLocation();
  const demo = /(?:\?|&)demo=1(?:&|$)/.test(location.searchStr);
  const [search, setSearch] = useState('');
  const [hotelStatus, setHotelStatus] = useState('all');
  return <DashboardGlobal.Provider value={{ filter: { ...defaultGlobalFilter, range: 'all', search, hotelStatus }, demo, now: demo ? DEMO_NOW : '' }}><div className="flex flex-wrap gap-2"><Input aria-label="ค้นหาโรงแรมในสัญญา" placeholder="ค้นหาโรงแรม…" className="h-9 w-full sm:w-72" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="สถานะโรงแรมในสัญญา" className="h-9 rounded-md border bg-background px-3 text-sm" value={hotelStatus} onChange={e => setHotelStatus(e.target.value)}><option value="all">ทุกสถานะ</option><option value="active">Active</option><option value="contract-end">Contract End</option><option value="terminated">Terminate</option></select>{demo && <span className="self-center text-xs font-semibold text-warning-foreground">DEMO</span>}</div><PsDashboard part="table" /></DashboardGlobal.Provider>;
}