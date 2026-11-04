/* R3.2 WB9 / WB12 — BD App › Workspace page: the testing role switcher at page level (both tabs), then the tab bar
 * `BD Workspace` · `BDM Workspace`. BD tab = the unchanged generic WorkspaceShell (switcher lifted out). BDM tab = list of
 * sections routed to BDM (Welcome Back only for now). Role / tab are simulation only (no login), never security. */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { setTicketDemo, type Role } from "@/lib/tickets-l0";
import { setRenewalDemo } from "@/lib/renewal-store";
import { isRenewalTestMode } from "@/lib/renewal-test-actor";
import { workspaceByDept } from "@/lib/workspace-registry";
import { WB_TEST_BDS, wbActorOf, wbPendingCount } from "@/lib/welcome-back-routing";
import { WB } from "@/lib/ps-glossary";
import { cn } from "@/lib/utils";
import { RoleSwitcher, WorkspaceShell, type WsRoleState } from "./workspace-shell";
import { BdmWelcomeBackSection, refreshWelcomeBack, useWelcomeBackSource } from "./welcome-back-section";
import { Button } from "@/components/ui/button";
import { onDemoSessionChange, psDemoOn } from "@/lib/demo-session";

export type BdTab = "bd" | "bdm";

/** R3.3 WB18 §3.1: `demo` = the page URL (?demo=1). The page follows PS Dashboard's DEMO state for this browser session
 * (src/lib/demo-session.ts) — page DEMO = URL DEMO or PS DEMO; `onDemoChange` lets the route put the same mode in the URL. */
export function BdWorkspacePage({ demo: urlDemo, ticket, tab: urlTab, onTabChange, onDemoChange }: { demo: boolean; ticket?: string | undefined; tab?: BdTab | undefined; onTabChange?: (t: BdTab) => void; onDemoChange?: (demo: boolean) => void }) {
  const config = workspaceByDept("BD");
  const [psDemo, setPsDemo] = useState<boolean | null>(null);
  const [forceNormal, setForceNormal] = useState(false);
  useEffect(() => {
    const read = () => setPsDemo(psDemoOn());
    read();
    const off = onDemoSessionChange(read);
    const onVis = () => { if (document.visibilityState === "visible") read(); };
    window.addEventListener("focus", read); document.addEventListener("visibilitychange", onVis);
    return () => { off(); window.removeEventListener("focus", read); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  useEffect(() => { if (!urlDemo || psDemo) setForceNormal(false); }, [urlDemo, psDemo]);
  const demo = !forceNormal && (urlDemo || psDemo === true);
  const mismatch = psDemo !== null && demo !== psDemo;
  // Follow PS DEMO in the URL too, so the sidebar and the bell agree with this page.
  useEffect(() => { if (psDemo && !urlDemo) onDemoChange?.(true); }, [psDemo, urlDemo]); // eslint-disable-line react-hooks/exhaustive-deps
  const matchPs = () => { const on = !!psDemo; if (!on) setForceNormal(true); onDemoChange?.(on); };
  const [ready, setReady] = useState(false);
  useEffect(() => { if (psDemo === null) return; setRenewalDemo(demo); setTicketDemo(demo); setReady(true); }, [demo, psDemo]);
  const [role, setRoleRaw] = useState<Role | "BDM">(config.dept_key); // default role unchanged (BD)
  const [bdMember, setBdMember] = useState<string>(WB_TEST_BDS[0].member_id);
  const [tab, setTabRaw] = useState<BdTab>(urlTab ?? "bd");
  useEffect(() => { if (urlTab) setTabRaw(urlTab); }, [urlTab]);
  const setTab = (t: BdTab) => { setTabRaw(t); onTabChange?.(t); };
  // Switching role to BDM → BDM tab; to BD → BD tab; other roles keep the current tab.
  const setRole = (r: Role | "BDM") => { setRoleRaw(r); if (r === "BDM") setTab("bdm"); else if (r === "BD") setTab("bd"); };
  const state: WsRoleState = { role, setRole, bdMember, setBdMember };
  const testing = isRenewalTestMode();
  const isBdm = role === "BDM";
  const showBdmTab = testing || isBdm; // real use: BDM only · testing mode: always
  const active: BdTab = tab === "bdm" && showBdmTab ? "bdm" : "bd";
  const { tickets } = useWelcomeBackSource(demo);
  useEffect(() => { refreshWelcomeBack(); }, [active, role, bdMember]); // R3.3 WB17: fresh read on tab / role change
  if (!ready) return null;
  const pending = wbPendingCount(tickets);
  const actor = wbActorOf(role, bdMember);
  const member = role === "BD" ? actor.label : null;

  return (
    <div className="space-y-4">
      {mismatch && (
        <div role="status" data-testid="bd-ws-mode-mismatch" className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
          <span>{WB.modeMismatch(WB.modeName(!!psDemo), WB.modeName(demo))}</span>
          <Button size="sm" variant="outline" className="h-7" onClick={matchPs}>{WB.modeFix}</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3" data-testid="bd-ws-switcher">
        <RoleSwitcher dept="BD" state={state} />
        {testing && <Badge variant="outline" className="text-xs" data-testid="bd-ws-banner">{WB.banner(role, member)}</Badge>}
      </div>
      <div role="tablist" aria-label={WB.tabs.aria} className="flex gap-1 border-b">
        <TabBtn active={active === "bd"} onClick={() => setTab("bd")} id="bd">{WB.tabs.bd}</TabBtn>
        {showBdmTab && (
          <TabBtn active={active === "bdm"} onClick={() => setTab("bdm")} id="bdm">
            {WB.tabs.bdm}
            {pending > 0 && <Badge className="ml-1.5 tabular-nums" data-testid="bdm-tab-badge">{pending}</Badge>}
          </TabBtn>
        )}
      </div>
      {active === "bd" ? (
        <div role="tabpanel" aria-labelledby="bdws-tab-bd">
          <WorkspaceShell config={config} demo={demo} ticket={ticket} roleState={state} onGoBdm={() => setTab("bdm")} />
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby="bdws-tab-bdm" className="space-y-4" data-testid="bdm-tab">
          <div>
            <h2 className="text-xl font-semibold">{WB.bdmTitle}</h2>
            <p className="text-sm text-muted-foreground">{WB.bdmSub}</p>
          </div>
          {isBdm ? (
            // Sections routed to BDM — Welcome Back is the only one now.
            <div className="space-y-4">
              <BdmWelcomeBackSection actor={actor} demo={demo} initialTicket={ticket} psDemo={!!psDemo} testing={testing} />
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-dashed p-6 text-center text-sm" data-testid="bdm-gate">
              <p>{WB.bdmOnly}</p>
              <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setRole("BDM")}>{WB.bdmSwitch}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, id, children }: { active: boolean; onClick: () => void; id: string; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" id={`bdws-tab-${id}`} aria-selected={active} onClick={onClick}
      className={cn("-mb-px flex items-center border-b-2 px-3 py-2 text-sm font-medium", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}
