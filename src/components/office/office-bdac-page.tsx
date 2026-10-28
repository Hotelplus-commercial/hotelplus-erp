/* The Office APP › BD-AC — the BD-AC tab moved out of PS Dashboard (RV23).
 * Mounts the SAME BdacTab / BdacFinanceSection / DashboardCompare / DashboardGlobalFilters components
 * (imported from src/components/ps, never forked) with its own filter + demo state, so PS Dashboard
 * filters and this page are independent. Data inputs mirror what PS Dashboard passed before the move. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/erp-ui";
import { BdacTab } from "@/components/ps/bdac-tab";
import { BdacFinanceSection } from "@/components/ps/bdac-finance-section";
import { DashboardCompare } from "@/components/ps/dashboard-compare";
import { DashboardGlobalFilters, DemoToggle } from "@/components/ps/dashboard-global-filters";
import { bdacSourceLines, dealBookLines } from "@/lib/bdac-scope";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { formatFullDateEn } from "@/lib/date-en";
import { useHrMembers, teamLabel } from "@/lib/hr-members";
import {
  DashboardGlobal,
  defaultGlobalFilter,
  matchesBook,
  selectedPeriod,
  type GlobalFilter,
} from "@/lib/ps-dashboard-global";
import { readPsDashboard } from "@/lib/ps-dashboard.functions";
import { BDAC_DEMO_NOW, DEMO_NOW, buildDemoReport, demoBdacLifecycles, demoLifecycles } from "@/lib/ps-demo-fixture";

export function OfficeBdacPage() {
  const [filterState, setFilter] = useState<GlobalFilter>(defaultGlobalFilter);
  const { members } = useHrMembers();
  const filter = useMemo(
    () => ({
      ...filterState,
      ownerAliases: Object.fromEntries(
        members.map((m) => [m.id, [m.nickname, teamLabel(m.orm_team)].filter(Boolean)]),
      ),
    }),
    [filterState, members],
  );
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    setReady(true);
    const update = () => setDemo(new URLSearchParams(window.location.search).get("demo") === "1");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const toggleDemo = () => {
    const on = !demo;
    setDemo(on);
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("demo", "1");
    else url.searchParams.delete("demo");
    window.history.replaceState(window.history.state, "", url);
  };

  /* Same clocks as before the move: page clock = PS spine (AC finance), BD-AC cards = BD-AC demo clock. */
  const nowString = demo ? DEMO_NOW : new Date().toISOString();
  const now = new Date(nowString);
  const bdacNow = demo ? new Date(BDAC_DEMO_NOW) : now;
  const { lifecycles } = useContractLifecycle();
  const bdacLines = bdacSourceLines(demo ? demoBdacLifecycles() : lifecycles, filter, demo);

  /* Compare Signed/Won used PS Dashboard's deal rows (AE owner from Account Health). Same existing read,
   * shared cache key, fetched only when Compare is on. */
  const read = useServerFn(readPsDashboard);
  const ps = useQuery({
    queryKey: ["ps-dashboard-views"],
    queryFn: () => read(),
    staleTime: 60_000,
    enabled: ready && !demo && filter.compare,
  });
  const health = useMemo(() => {
    if (!filter.compare) return undefined;
    if (demo) return buildDemoReport(filter).views.v_ps_account_health;
    return ps.data?.views.v_ps_account_health.filter((r) => matchesBook(r, filter, true));
  }, [demo, filter, ps.data]);
  const compareLines = filter.compare ? dealBookLines(demo ? demoLifecycles() : lifecycles, filter, health, demo) : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="THE OFFICE APP · BD-AC"
        title="BD-AC"
        description="ดีลจาก BD ถึง AC · Approved QT → WON · การเงินจาก AC"
        actions={<DemoToggle demo={demo} onDemo={toggleDemo} />}
      />
      <DashboardGlobal.Provider value={{ filter, demo, now: nowString }}>
        <div className="ps-dashboard-visual flex min-w-0 flex-col gap-4" data-testid="office-bdac-page">
          <DashboardGlobalFilters value={filter} onChange={setFilter} demo={demo} onDemo={toggleDemo} now={now} hideDemo />
          <div className="min-w-0 space-y-4">
            {demo && (
              <p className="text-xs font-semibold text-warning-foreground">DEMO · {formatFullDateEn(BDAC_DEMO_NOW)}</p>
            )}
            {filter.compare && <DashboardCompare report={undefined} ac={undefined} deals={compareLines} tab="bdac" />}
            {filter.compare ? (
              <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                {(["A", "B"] as const).map((side) => (
                  <div key={side} className="min-w-0">
                    <h2 className="mb-3 text-sm font-semibold">Period {side}</h2>
                    <BdacTab
                      source={bdacLines}
                      globalFilter={{ ...filter, periodA: selectedPeriod(filter, bdacNow, side) }}
                      clock={bdacNow.getTime()}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <BdacTab source={bdacLines} globalFilter={filter} clock={bdacNow.getTime()} />
            )}
            <BdacFinanceSection />
          </div>
        </div>
      </DashboardGlobal.Provider>
    </div>
  );
}
