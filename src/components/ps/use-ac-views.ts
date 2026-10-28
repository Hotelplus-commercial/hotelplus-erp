/* Shared AC report reads for the PS Dashboard (moved unchanged from ps-dashboard-shell so the tab
 * "ลูกหนี้ & ค่าใช้จ่ายรายสัญญา" and BD-AC "การเงินจาก AC" mount the same cards on the same inputs — F5). Read-only. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { readAcDashboard } from "@/lib/ac-dashboard.functions";
import { selectedPeriod, useDashboardGlobal } from "@/lib/ps-dashboard-global";
import { demoAcViews } from "@/lib/ps-demo-fixture";
import type { PsReportRow } from "@/lib/ps-dashboard-types";
import type { AcTabProps } from "./ac-tab";

export function useAcViews() {
  const { demo } = useDashboardGlobal();
  const read = useServerFn(readAcDashboard);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const real = useQuery({
    queryKey: ["ac-dashboard-views"],
    queryFn: () => read(),
    staleTime: 60_000,
    enabled: ready && !demo,
  });
  return demo ? { data: demoAcViews(), isLoading: false, isError: false } : real;
}

/** Exactly the props the AC tab receives today (period-scoped ranking + grade rows). */
export function useAcTabInput(): AcTabProps & { raw: Record<string, PsReportRow[]> | undefined } {
  const { filter: f, demo, now: nowString } = useDashboardGlobal();
  const q = useAcViews();
  const now = new Date(nowString);
  const views = useMemo(() => {
    const d = q.data as Record<string, PsReportRow[]> | undefined;
    if (!d) return undefined;
    const per = selectedPeriod(f, now, "A");
    const perB = f.compare ? selectedPeriod(f, now, "B") : null;
    const inRange = (r: PsReportRow) => {
      const p = String(r.billing_period ?? "").slice(0, 10);
      return (p >= per.from && p <= per.to) || (perB != null && p >= perB.from && p <= perB.to);
    };
    return {
      ...d,
      v_ac_invoice_ranking: (d["v_ac_invoice_ranking"] ?? []).filter(inRange),
      v_ac_grade_distribution: (d["v_ac_grade_distribution"] ?? []).filter(inRange),
    };
  }, [q.data, f, nowString]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    raw: q.data as Record<string, PsReportRow[]> | undefined,
    views,
    loading: q.isLoading,
    error: q.isError,
    service: f.service,
    compare: f.compare,
    demo,
    periodA: selectedPeriod(f, now, "A"),
    periodB: f.compare ? selectedPeriod(f, now, "B") : null,
  };
}
