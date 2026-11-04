/* R3.1 WB5 / WB6 — Welcome Back section in the BD Workspace 🎫 lane + its detail drawer.
 * BDM-first routing: BDM sees all and assigns one BD (or ฉันทำเอง); a BD sees only tickets assigned to them; the creator
 * role keeps its own tickets for the L0 cancel. Writes only through assign/start/finish/cancelWelcomeBack (revision-checked).
 * DEMO: reads and writes card ④'s in-memory Welcome Back store (plus its seed tickets); nothing reaches real storage. */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  assignWelcomeBack, cancelWelcomeBack, finishWelcomeBack, startWelcomeBack, useTickets,
  type L0Ticket, type WbActor, type WbCtx, type WbOut,
} from "@/lib/tickets-l0";
import { CONTRACT_AGE_DEMO_NOW, contractAgeDemo, demoWelcomeBackSink, useDemoWelcomeBack } from "@/lib/contract-age-demo";
import { WB_TEST_BDM, WB_TEST_BDS, wbActions, wbGroups, wbMerge, wbPill, wbVisible } from "@/lib/welcome-back-routing";
import { WB } from "@/lib/ps-glossary";
import { cn } from "@/lib/utils";

const thDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
};
const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

/** Welcome Back tickets this lane works on + the DEMO write context. */
export function useWelcomeBackSource(demo: boolean): { tickets: L0Ticket[]; ctx: WbCtx | undefined } {
  const store = useTickets();
  const sink = useDemoWelcomeBack();
  return useMemo(() => {
    if (!demo) return { tickets: store.filter((t) => t.type === "WELCOME_BACK"), ctx: undefined };
    const seed = contractAgeDemo().tickets;
    const tickets = wbMerge(store, sink, seed);
    const overridden = new Set([...store, ...sink].map((t) => t.ticket_id));
    return { tickets, ctx: { extra: seed.filter((t) => !overridden.has(t.ticket_id)), sink: demoWelcomeBackSink, at: `${CONTRACT_AGE_DEMO_NOW}T03:00:00.000Z` } };
  }, [demo, store, sink]);
}

export function WelcomeBackSection({ actor, demo, initialTicket }: { actor: WbActor; demo: boolean; initialTicket?: string | undefined }) {
  const { tickets, ctx } = useWelcomeBackSource(demo);
  const [showClosed, setShowClosed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    const t = initialTicket ? tickets.find((x) => x.ticket_id === initialTicket) : undefined;
    if (t && wbVisible(t, actor)) setOpenId(t.ticket_id);
  }, [initialTicket]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = wbGroups(tickets, actor, showClosed);
  const count = tickets.filter((t) => wbVisible(t, actor)).length;
  const open = tickets.find((t) => t.ticket_id === openId && wbVisible(t, actor)) ?? null;
  return (
    <section className="space-y-2 rounded-md border p-3" data-testid="wb-section" aria-label={WB.section}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium">{WB.section} <Badge variant="secondary" className="tabular-nums">{count}</Badge></h4>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> {WB.showClosed}
        </label>
      </div>
      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5" data-testid={`wb-group-${g.key}`}>
          <p className="text-xs font-medium text-muted-foreground">{g.label}</p>
          {g.rows.length === 0 ? (g.empty ? <p className="rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{g.empty}</p> : null) : (
            <ul className="space-y-1.5">
              {g.rows.map((t) => <WbRow key={t.ticket_id} t={t} onOpen={() => setOpenId(t.ticket_id)} />)}
            </ul>
          )}
        </div>
      ))}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="mb-4 space-y-1 text-left">
                <SheetTitle>{WB.detail.title(open.ticket_id)}</SheetTitle>
                <SheetDescription asChild>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{wbPill(open)}</Badge>
                    {/* No sender name is stored on the ticket (only the role), so the role is the name here. */}
                    <span>{WB.sentBy(ROLE_TH[open.created_by] ?? open.created_by, thDate(open.created_at))}</span>
                  </div>
                </SheetDescription>
              </SheetHeader>
              <WbDetailBody t={open} actor={actor} ctx={ctx} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function WbRow({ t, onOpen }: { t: L0Ticket; onOpen: () => void }) {
  const s = t.payload.snapshot;
  const svc = t.subject_ref.service ?? t.subject_ref.service_line ?? t.subject_ref.gap_service;
  return (
    <li>
      <button type="button" onClick={onOpen} className="w-full rounded-md border px-2.5 py-2 text-left text-xs hover:bg-muted/50" data-testid="wb-row">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono">#{t.ticket_id}</span>
          <span className="font-medium">{t.subject_ref.hotel_name}</span>
          <span className={cn("r1-svc", svc === "ORM" ? "svc-orm" : "svc-marcom")}>{svc}</span>
          <Badge variant="outline" className="ml-auto">{wbPill(t)}</Badge>
        </div>
        <div className="mt-1 text-muted-foreground">
          {WB.exitOn(thDate(s?.exit_status["ended_at"]))} · {dash(s?.exit_status["outcome"])} · {WB.sentBy(t.created_by, thDate(t.created_at))}
        </div>
      </button>
    </li>
  );
}

const ROLE_TH: Record<string, string> = { PM: "PM", PS: "PS", AE: "AE" };

/** §5 body (sections 1–8 + actions footer); the drawer header (title · status · ส่งโดย) wraps it. */
export function WbDetailBody({ t, actor, ctx }: { t: L0Ticket; actor: WbActor; ctx: WbCtx | undefined }) {
  const D = WB.detail;
  const s = t.payload.snapshot;
  const ci = s?.contract_info ?? {};
  const pr = s?.package_rate ?? {};
  const ex = s?.exit_status ?? {};
  const actions = wbActions(t, actor);
  const [pick, setPick] = useState<string>(t.assigned_to && WB_TEST_BDS.some((m) => m.member_id === t.assigned_to) ? t.assigned_to : WB_TEST_BDS[0].member_id);
  const [err, setErr] = useState<string | null>(null);
  const done = (o: WbOut, ok: string) => {
    if (o.ok) { setErr(null); toast.success(ok); return; }
    const m = o.error === "conflict" ? WB.conflict : WB.notAllowed;
    setErr(m); toast.error(m);
  };
  const hotel = [ci["name_th"], ci["name_en"]].filter((x) => x && x.trim()).join(" · ") || t.subject_ref.hotel_name;
  const files = t.payload.drive_attachments ?? [];
  return (
    <div className="space-y-4 text-sm" data-testid="wb-detail">
      <Sec id="info" title={D.info}>
        <dl className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] gap-1 break-words">
          <dt className="text-muted-foreground">{D.hotel}</dt><dd>{hotel}</dd>
          <dt className="text-muted-foreground">{D.contract}</dt><dd className="tabular-nums">{dash(ci["contract_id"] ?? t.subject_ref.contract_id)}</dd>
          <dt className="text-muted-foreground">{D.service}</dt><dd>{dash(ci["service"] ?? t.subject_ref.service)}</dd>
          <dt className="text-muted-foreground">{D.period}</dt><dd className="tabular-nums">{thDate(ci["signed"])} → {thDate(ex["ended_at"])}</dd>
          <dt className="text-muted-foreground">{D.ae}</dt><dd>{dash(ci["ae"])}</dd>
        </dl>
      </Sec>
      <Sec id="package" title={D.pkg}>
        <dl className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)] gap-1 break-words">
          <dt className="text-muted-foreground">{D.pkgName}</dt><dd>{dash(pr["package"])}</dd>
          <dt className="text-muted-foreground">{D.rate}</dt><dd>{dash(pr["rate"])}</dd>
          {pr["upsell"] && <><dt className="text-muted-foreground">{D.upsell}</dt><dd>{pr["upsell"]}</dd></>}
        </dl>
      </Sec>
      <Sec id="exit" title={D.exit}>
        <p>{dash(ex["outcome"])} · {thDate(ex["ended_at"])}</p>
      </Sec>
      <Sec id="why" title={D.why}>
        {s?.reasons && (s.reasons.primary.length || s.reasons.secondary) ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1"><span className="text-xs text-muted-foreground">{D.primary}</span>{s.reasons.primary.map((k) => <span key={k} className="cl-chip is-red">{k}</span>)}</div>
            {s.reasons.secondary && <div className="flex flex-wrap items-center gap-1"><span className="text-xs text-muted-foreground">{D.secondary}</span><span className="cl-chip is-amber">{s.reasons.secondary}</span></div>}
            {s.reasons.ae_note && <p className="text-xs text-muted-foreground">{D.aeNote(s.reasons.ae_note)}</p>}
          </div>
        ) : <p className="text-muted-foreground">{D.noReason}</p>}
      </Sec>
      {t.payload.message && <Sec id="message" title={D.msg}><p className="whitespace-pre-wrap">{t.payload.message}</p></Sec>}
      {t.payload.timeline_shared && t.payload.timeline?.length ? (
        <Sec id="timeline" title={D.timeline}>
          <ol className="space-y-0.5 text-xs">{t.payload.timeline.map((e, i) => <li key={`${e.at}-${i}`} className="tabular-nums">{thDate(e.at)} · {e.text}</li>)}</ol>
        </Sec>
      ) : null}
      {files.length > 0 && (
        <Sec id="files" title={D.files}>
          <ul className="space-y-0.5 text-xs">{files.map((f) => <li key={f.drive_url}><a className="text-primary underline" href={f.drive_url} target="_blank" rel="noreferrer">{f.name}</a></li>)}</ul>
        </Sec>
      )}
      <Sec id="history" title={D.history}>
        <ol className="space-y-0.5 text-xs text-muted-foreground">
          {t.audit.map((a, i) => <li key={i}><span className="tabular-nums">{thDate(a.at)}</span> · {historyText(t, a)}</li>)}
        </ol>
      </Sec>

      <footer className="space-y-2 border-t pt-3" data-testid="wb-actions">
        {actions.length === 0 && <p className="text-xs text-muted-foreground">{D.readOnly}</p>}
        {actions.includes("ASSIGN") && (
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label={D.pick} className="rounded-md border bg-background px-2 py-1 text-xs" value={pick} onChange={(e) => setPick(e.target.value)}>
              {WB_TEST_BDS.map((m) => <option key={m.member_id} value={m.member_id}>{m.label}</option>)}
            </select>
            <Button size="sm" onClick={() => { const m = WB_TEST_BDS.find((x) => x.member_id === pick)!; done(assignWelcomeBack(t, m, actor, ctx), WB.toast.assigned(m.label)); }}>
              {t.assigned_to ? D.reassign : D.assign}
            </Button>
            {actions.includes("SELF") && <Button size="sm" variant="outline" onClick={() => done(assignWelcomeBack(t, WB_TEST_BDM, actor, ctx), WB.toast.assigned(WB_TEST_BDM.label))}>{D.self}</Button>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {actions.includes("START") && <Button size="sm" onClick={() => done(startWelcomeBack(t, actor, ctx), WB.toast.started)}>{D.start}</Button>}
          {actions.includes("DONE") && <Button size="sm" onClick={() => done(finishWelcomeBack(t, actor, ctx), WB.toast.closed)}>{D.done}</Button>}
          {actions.includes("CANCEL") && <Button size="sm" variant="outline" onClick={() => done(cancelWelcomeBack(t, actor, ctx), WB.toast.cancelled)}>{D.cancel}</Button>}
        </div>
        {err && <p role="alert" className="text-xs text-warning-foreground">{err}</p>}
      </footer>
    </div>
  );
}

function historyText(t: L0Ticket, a: L0Ticket["audit"][number]): string {
  const D = WB.detail;
  if (!a.from_status) return D.created(a.by);
  if (a.note?.startsWith("assigned → ")) return D.assignedEv(a.actor ?? "BDM", a.note.slice("assigned → ".length));
  const who = a.actor ?? t.assigned_to_label ?? a.by;
  if (a.to_status === "IN_PROGRESS") return D.started(who);
  if (a.to_status === "DONE") return D.doneEv(who);
  if (a.to_status === "CANCELLED") return D.cancelledEv(a.actor ?? a.by);
  return D.started(who);
}

function Sec({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-sec={id} className="space-y-1.5">
      <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}
