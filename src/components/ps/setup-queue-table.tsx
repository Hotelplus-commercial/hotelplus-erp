/* Tab R4 §12 — tab On-board / Off-board: section "สัญญาในคิว และเวลาแต่ละเฟส" + deep link `?card={id}`.
 * Read-only (same feed as card ⑤). Opening a card reuses the tab's existing drawer (ServicingCardDrawer, read-only). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { InfoButton } from './dash-card';
import { ServicingCardDrawer } from './servicing-dashboard';
import { GoLivePeriodControl } from './setup-duration-card';
import { useSetupFeed } from './use-setup-timing';
import { SD } from '@/lib/ps-glossary';
import { useServicing } from '@/lib/ps-servicing';
import { monthKey, thDate } from '@/lib/contract-age';
import { useSetupKpiVersions, versionFor, type KpiValues } from '@/lib/setup-kpi-settings';
import {
  QUEUE_PAGE, inGoLive, mostText, queueCount, queueLevel, queueSummary, stageText, statusFor,
  type GoLivePeriod, type LaneKey, type SetupStatusResult, type SetupSvc, type SetupTiming,
} from '@/lib/setup-timing';
import { cn } from '@/lib/utils';

type Col = LaneKey | 'total';
const COLS: Col[] = ['p1', 'p2s', 'p2o', 'w', 'p3', 'total'];
const dueText = (v: KpiValues, a: keyof KpiValues, b: keyof KpiValues) => (v[a].due === v[b].due ? `≤ ${v[a].due}` : `ORM ≤ ${v[a].due} · MC ≤ ${v[b].due}`);

export function SetupQueueTable() {
  const feed = useSetupFeed();
  const versions = useSetupKpiVersions(feed?.demo ?? false);
  const servicing = useServicing();
  const [view, setView] = useState<'queue' | 'live'>('queue');
  const [period, setPeriod] = useState<GoLivePeriod | null>(null);
  const [svc, setSvc] = useState<'ALL' | SetupSvc>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const handled = useRef<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const timings = useMemo(() => feed?.timings ?? [], [feed]);
  const st = useMemo(() => new Map(timings.map((t) => [t.card_id, statusFor(t, versions)])), [timings, versions]);
  const today = feed?.today ?? '';
  const p: GoLivePeriod = period ?? { kind: 'month', key: today ? monthKey(today) : '' };
  const term = q.trim().toLowerCase();
  const match = (t: SetupTiming) => (svc === 'ALL' || t.svc === svc) && (!term || t.hotel_name.toLowerCase().includes(term));
  const inQueue = useMemo(() => timings.filter((t) => !t.done).sort((a, b) => b.elapsed - a.elapsed), [timings]);
  const went = useMemo(() => timings.filter((t) => t.done && inGoLive(t, p)).sort((a, b) => (b.go_live ?? '').localeCompare(a.go_live ?? '')), [timings, p]);
  const list = (view === 'queue' ? inQueue : went).filter(match);
  const pages = Math.max(1, Math.ceil(list.length / QUEUE_PAGE));
  const pg = Math.min(page, pages);
  const rows = list.slice((pg - 1) * QUEUE_PAGE, pg * QUEUE_PAGE);

  /* §12.3 deep link: switch table tab / page / row, scroll, highlight ~3 s, open the existing card detail. */
  useEffect(() => {
    if (!feed || !timings.length) return;
    const run = (id: string | null) => {
      if (!id || handled.current === id) return;
      handled.current = id;
      const url = new URL(window.location.href); url.searchParams.delete('card'); window.history.replaceState(window.history.state, '', url);
      const t = timings.find((x) => x.card_id === id);
      if (!t) { toast.error(SD.queue.notFound); return; }
      const nextView = t.done ? 'live' : 'queue';
      const nextPeriod: GoLivePeriod = t.done && t.go_live ? { kind: 'month', key: monthKey(t.go_live) } : p;
      const base = t.done ? timings.filter((x) => x.done && inGoLive(x, nextPeriod)).sort((a, b) => (b.go_live ?? '').localeCompare(a.go_live ?? '')) : inQueue;
      setView(nextView); setPeriod(nextPeriod); setSvc('ALL'); setQ('');
      setPage(Math.floor(Math.max(0, base.findIndex((x) => x.card_id === id)) / QUEUE_PAGE) + 1);
      setFlash(id); setTimeout(() => setFlash((f) => (f === id ? null : f)), 3000);
      setTimeout(() => sectionRef.current?.querySelector(`[data-card-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
      if (feed.demo) toast.info(SD.queue.demoOpen);
      else if (servicing.cards.some((c) => c.id === id)) setDrawer(id);
      else toast.info(SD.queue.notLocal);
    };
    run(new URLSearchParams(window.location.search).get('card'));
    const on = (e: Event) => { handled.current = null; run((e as CustomEvent<{ card?: string }>).detail?.card ?? null); };
    window.addEventListener('psdash:open-tab', on);
    return () => window.removeEventListener('psdash:open-tab', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, timings]);

  if (!feed) return null;
  const latest = versionFor(versions, today).values;
  const sum = queueSummary(inQueue.filter(match), st);
  const overLive = went.filter(match).filter((t) => st.get(t.card_id)?.total === 'late').length;
  const sub: Record<Col, string> = {
    p1: SD.queue.sub.p1(latest.p1.due), p2s: SD.queue.sub.p2s(latest.p2s.due), p2o: SD.queue.sub.p2o(dueText(latest, 'p2o_orm', 'p2o_mc')),
    w: SD.queue.sub.w, p3: SD.queue.sub.p3(dueText(latest, 'p3_orm', 'p3_mc')), total: SD.queue.sub.total(dueText(latest, 'total_orm', 'total_mc')),
  };
  const footVals = (c: Col) => list.flatMap((t) => (c === 'total' ? [t.elapsed] : t.lanes[c].state === 'done' && t.lanes[c].days != null ? [t.lanes[c].days!] : []));
  return (
    <section ref={sectionRef} className="dash-card sd-queue" id="setup-queue" data-testid="sd-queue">
      <header className="dash-card-header">
        <h2>{SD.queue.title}<InfoButton info={{ read: SD.queue.info }} /></h2>
      </header>
      <div className="sd-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'queue'} className={cn('sd-pill', view === 'queue' && 'is-on')} onClick={() => { setView('queue'); setPage(1); }}>{SD.queue.tabIn(inQueue.length)}</button>
        <button type="button" role="tab" aria-selected={view === 'live'} className={cn('sd-pill', view === 'live' && 'is-on')} onClick={() => { setView('live'); setPage(1); }}>{SD.queue.tabLive(went.length)}</button>
      </div>
      <div className="sd-queue-filters">
        {view === 'live' && <GoLivePeriodControl period={p} onChange={(x) => { setPeriod(x); setPage(1); }} timings={timings} today={today} />}
        <div className="sd-seg" role="group">
          {(['ALL', 'ORM', 'Marcom'] as const).map((k) => <button key={k} type="button" aria-pressed={svc === k} className={cn(svc === k && 'is-on')} onClick={() => { setSvc(k); setPage(1); }}>{SD.queue.svc[k]}</button>)}
        </div>
        <input type="search" className="sd-search" placeholder={SD.queue.search} aria-label={SD.queue.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className="sd-quick">
        {view === 'queue' ? (<>
          <span className="sd-chip">{SD.queue.chips.n(sum.n)}</span><span className="sd-chip">{SD.queue.chips.p1(sum.p1)}</span><span className="sd-chip">{SD.queue.chips.p2(sum.p2)}</span>
          <span className="sd-chip">{SD.queue.chips.w(sum.w)}</span><span className="sd-chip">{SD.queue.chips.p3(sum.p3)}</span>
          <span className={cn('sd-chip', sum.laneLate > 0 && 'sd-chip-late is-on')}>{SD.queue.chips.laneLate(sum.laneLate)}</span>
          <span className={cn('sd-chip', sum.totalLate > 0 && 'sd-chip-late is-on')}>{SD.queue.chips.totalLate(sum.totalLate)}</span>
        </>) : (<>
          <span className="sd-chip">{SD.queue.chips.live(list.length)}</span><span className="sd-chip">{SD.queue.chips.most(mostText(list.map((t) => t.elapsed)))}</span>
          <span className={cn('sd-chip', overLive > 0 && 'sd-chip-late is-on')}>{SD.queue.chips.over(overLive)}</span>
        </>)}
      </div>
      <div className="sd-table-scroll">
        <table className="sd-table sd-queue-table" data-testid="sd-queue-table">
          <thead><tr>
            <th>{SD.queue.cols.contract}</th><th>{SD.queue.cols.svc}</th><th>{view === 'queue' ? SD.queue.cols.start : SD.queue.cols.startLive}</th>
            {COLS.map((c) => <th key={c}>{c === 'total' ? (view === 'queue' ? SD.queue.cols.elapsed : SD.queue.cols.total) : SD.queue.cols[c]}<small>{sub[c]}</small></th>)}
            <th>{SD.queue.cols.stage}</th>
          </tr></thead>
          <tbody>
            {rows.map((t) => {
              const s = st.get(t.card_id); const n = queueCount(t, timings); const lvl = queueLevel(n, t.svc);
              return <tr key={t.card_id} data-card-row={t.card_id} className={cn(flash === t.card_id && 'sd-flash')}>
                <td>{t.hotel_name}{t.gmb && <span className="cl-muted">{SD.queue.gmb}</span>}</td>
                <td><span className={cn('sd-svc', t.svc === 'ORM' ? 'is-orm' : 'is-mc')}>{t.svc}</span></td>
                <td>{view === 'queue' ? thDate(t.day0) : `${thDate(t.day0)} → ${thDate(t.go_live)}`}</td>
                {COLS.map((c) => <QueueCell key={c} t={t} c={c} s={s} />)}
                <td>{view === 'queue' ? SD.queue.stage(stageText(t), lvl) : SD.queue.startQueue(n, lvl)}</td>
              </tr>;
            })}
            {!rows.length && <tr><td colSpan={10} className="cl-muted">{SD.queue.empty}</td></tr>}
          </tbody>
          <tfoot><tr>
            <td colSpan={3}>{SD.queue.foot}{view === 'queue' && SD.queue.footDone} <span className="cl-muted">· {SD.queue.unit}</span></td>
            {COLS.map((c) => <td key={c}>{mostText(footVals(c))}</td>)}<td />
          </tr></tfoot>
        </table>
      </div>
      <div className="sd-pager">
        <span>{SD.queue.pager(list.length)}</span>
        <button type="button" disabled={pg <= 1} onClick={() => setPage(pg - 1)} aria-label="ก่อนหน้า">‹</button>
        {Array.from({ length: pages }, (_, i) => i + 1).filter((i) => i === 1 || i === pages || Math.abs(i - pg) <= 1).map((i, k, arr) => (
          <span key={i}>{k > 0 && arr[k - 1]! < i - 1 && '… '}<button type="button" aria-current={i === pg} className={cn(i === pg && 'is-on')} onClick={() => setPage(i)}>{i}</button></span>
        ))}
        <button type="button" disabled={pg >= pages} onClick={() => setPage(pg + 1)} aria-label="ถัดไป">›</button>
      </div>
      <ServicingCardDrawer key={drawer ?? 'closed'} id={drawer} readOnly onClose={() => setDrawer(null)} />
    </section>
  );
}

function QueueCell({ t, c, s }: { t: SetupTiming; c: Col; s: SetupStatusResult | undefined }) {
  if (c === 'total') return <td className={cn('sd-num', s?.total === 'late' && 'sd-cell-late')}>{t.elapsed}</td>;
  const l = t.lanes[c]; const late = s?.lanes[c] === 'late';
  if (l.state === 'na') return <td className="cl-muted">{SD.queue.na}</td>;
  if (l.state === 'not_started' || l.days == null) return <td className="cl-muted">—</td>;
  if (l.state === 'running') return <td><span className={cn('sd-running', late && 'is-late')} data-state="running"><small>{SD.queue.running}</small>{l.days}</span></td>;
  return <td className={cn('sd-num', late && 'sd-cell-late')} data-state="done">{l.days}</td>;
}
