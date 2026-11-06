/* Settings › SLA On-board (On-board R1 §13, OB3 OB14 OB17–OB22). Data = setup_kpi_settings (same 8 keys, same versioning,
 * same save rule as R4 §4.2). PM-only edit through the testing "สวมบท" switch (simulation, never production security);
 * everyone else read only. The only write in this round is saveKpiVersion → setKpiVersions. */
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { InfoTip, useOnbFeed } from './onboard-tab';
import { onDemoSessionChange, psDemoOn } from '@/lib/demo-session';
import { KPI_KEYS, saveKpiVersion, setKpiVersions, useSetupKpiVersions, versionFor, type KpiKey, type KpiValues, type Thr } from '@/lib/setup-kpi-settings';
import { dayLeft, mostRange, p80, pctLe, vOnbSettingsAnalysis, type CompareMode, type Level } from '@/lib/onboard-tab';
import { monthLabel, thDate } from '@/lib/contract-age';
import { SLA_ONB, onboardTips } from '@/lib/ps-glossary';
import { cn } from '@/lib/utils';
import type { SetupSvc } from '@/lib/setup-timing';

const useDemo = () => useSyncExternalStore(onDemoSessionChange, psDemoOn, () => false);
type Row = { label: string; team: string; key: KpiKey | null; total?: boolean };
const ROWS: Record<SetupSvc, Row[]> = {
  ORM: [
    { label: 'รวม On-board → Go Live', team: 'ทุกทีม', key: 'total_orm', total: true },
    { label: 'ช่วง AE · สร้างการ์ด → Approved', team: 'AE', key: 'p1' },
    { label: 'ช่วงเตรียมระบบ · Approved → ส่ง handover ครบ', team: 'Specialist', key: 'p2s' },
    { label: 'ช่วงเตรียมระบบ · Approved → สร้างนัดประชุม', team: 'ORM', key: 'p2o_orm' },
    { label: 'รอถึงวันประชุม', team: 'ลูกค้า', key: null },
    { label: 'ช่วงก่อน Go Live · วันประชุม → Go Live', team: 'ORM', key: 'p3_orm' },
  ],
  Marcom: [
    { label: 'รวม On-board → Go Live', team: 'ทุกทีม', key: 'total_mc', total: true },
    { label: 'ช่วง AE · สร้างการ์ด → Approved', team: 'AE', key: 'p1' },
    { label: 'ช่วงเตรียมระบบ · Approved → สร้างนัดประชุม (GMB → Go Live)', team: 'Marcom', key: 'p2o_mc' },
    { label: 'รอถึงวันประชุม', team: 'ลูกค้า', key: null },
    { label: 'ช่วงก่อน Go Live · วันประชุม → Go Live (MT)', team: 'Marcom', key: 'p3_mc' },
  ],
};
const validThr = (t: Thr) => Number.isInteger(t.ok) && Number.isInteger(t.due) && t.ok >= 0 && t.ok < t.due && t.due <= 60;
const pctTone = (p: number | null) => (p == null ? 'grey' : p >= 80 ? 'green' : p >= 60 ? 'amber' : 'red');

export function SlaOnboardSettings() {
  const demo = useDemo();
  const feed = useOnbFeed(demo);
  const versions = useSetupKpiVersions(demo);
  const today = feed?.today ?? new Date().toISOString().slice(0, 10);
  const current = versionFor(versions, today);
  const [actAs, setActAs] = useState<'PM' | 'OTHER'>('PM');
  const [draft, setDraft] = useState<KpiValues>(current.values);
  useEffect(() => setDraft(JSON.parse(JSON.stringify(current.values)) as KpiValues), [current]);
  const isPm = actAs === 'PM';
  const changed = KPI_KEYS.filter((k) => draft[k].ok !== current.values[k].ok || draft[k].due !== current.values[k].due);
  const invalid = KPI_KEYS.filter((k) => !validThr(draft[k]));
  const sameDay = versions.some((v) => v.effective_from === today);
  const set = (k: KpiKey, f: 'ok' | 'due', n: number) => setDraft((d) => ({ ...d, [k]: { ...d[k], [f]: n } }));
  const save = () => {
    const res = saveKpiVersion(versions, draft, today, isPm ? 'PM' : 'OTHER', new Date().toISOString());
    if (!res.ok) { toast.error(res.error); return; }
    setKpiVersions(demo, res.versions); toast.success(SLA_ONB.toast(thDate(today)));
  };
  const p1 = draft.p1; const ex = Array.from({ length: 10 }, (_, i) => i);
  return <div className="onb-set" data-testid="sla-onboard">
    <nav className="cl-muted text-sm"><Link to="/ps/settings">{SLA_ONB.crumb}</Link></nav>
    <header className="onb-head">
      <div className="min-w-0"><h1 className="text-xl font-semibold">{SLA_ONB.title}<InfoTip>{onboardTips.settings}</InfoTip></h1><p className="cl-note">{SLA_ONB.sub}</p></div>
      <div className="onb-head-right">
        <div>{SLA_ONB.current(thDate(current.effective_from), current.created_by === 'SYSTEM' ? 'ระบบ' : current.created_by)}</div>
        {demo && <span className="sv-demo-mark">DEMO · บันทึกในหน่วยความจำเท่านั้น</span>}
        <label className="sd-actas">สวมบท (ทดสอบ) <select aria-label="สวมบท (ทดสอบ)" value={actAs} onChange={(e) => setActAs(e.target.value as 'PM' | 'OTHER')}><option value="PM">PM</option><option value="OTHER">คนอื่น</option></select></label>
      </div>
    </header>
    {!isPm && <p className="onb-ro" data-testid="sla-ro">{SLA_ONB.readOnly}</p>}
    <div className="onb-boxes">
      <div className="onb-box"><b>{SLA_ONB.box1Title}</b><p>{SLA_ONB.box1}</p>
        <div className="onb-strip">{ex.map((d) => <span key={d} className={d <= p1.ok ? 'is-green' : d <= p1.due ? 'is-amber' : 'is-red'}>{d}</span>)}</div>
        <p className="cl-muted">Day left ที่ระบบแสดง: {[p1.ok - 1, p1.ok, p1.due - 1, p1.due, p1.due + 1].filter((d) => d >= 0).map((d) => `วันที่ ${d} = ${dayLeft(d, p1).text}`).join(' · ')}</p></div>
      <div className="onb-box"><b>{SLA_ONB.box2Title}</b><p>{SLA_ONB.box2}</p><p className="cl-muted">{SLA_ONB.box2b}</p></div>
    </div>
    {(['ORM', 'Marcom'] as const).map((svc) => <SvcBlock key={svc} svc={svc} feedCards={feed?.cards ?? []} today={today} draft={draft} base={current.values} isPm={isPm} set={set} />)}
    {isPm && <div className="onb-savebar" data-testid="sla-savebar">
      <span className={cn(invalid.length && 'onb-t-red')}>{invalid.length ? SLA_ONB.fix(invalid.length) : changed.length ? SLA_ONB.changed(changed.length, thDate(today), sameDay) : SLA_ONB.noChange}</span>
      <button type="button" className="sd-pill" disabled={!changed.length} onClick={() => setDraft(JSON.parse(JSON.stringify(current.values)) as KpiValues)}>{SLA_ONB.cancel}</button>
      <button type="button" className="sd-pill is-on" disabled={!changed.length || invalid.length > 0} onClick={save} data-testid="sla-save">{SLA_ONB.save}</button>
    </div>}
    <section className="dash-card onb-card"><h3>{SLA_ONB.history}</h3>
      <ul className="onb-hist" data-testid="sla-history">{[...versions].sort((a, b) => b.effective_from.localeCompare(a.effective_from)).map((v) => <li key={v.id}>
        <b>{thDate(v.effective_from)}</b>{v.id === current.id && <span className="onb-soon">{SLA_ONB.inUse}</span>} · {v.created_by === 'SYSTEM' ? 'ระบบ' : v.created_by} · <span className="cl-muted">{v.note}</span></li>)}</ul>
    </section>
  </div>;
}

function SvcBlock({ svc, feedCards, today, draft, base, isPm, set }: { svc: SetupSvc; feedCards: Parameters<typeof vOnbSettingsAnalysis>[0]; today: string; draft: KpiValues; base: KpiValues; isPm: boolean; set: (k: KpiKey, f: 'ok' | 'due', n: number) => void }) {
  const [mode, setMode] = useState<CompareMode>('level');
  const [level, setLevel] = useState<Level | null>(null);
  const a = useMemo(() => vOnbSettingsAnalysis(feedCards, svc, mode, level, today), [feedCards, svc, mode, level, today]);
  const levelsTxt = svc === 'ORM' ? 'ระดับคิว ORM เบา ≤ 3 · ปกติ 4–5 · หนัก ≥ 6' : 'ระดับคิว Marcom เบา ≤ 2 · ปกติ 3 · หนัก ≥ 4';
  const desc = mode === 'level'
    ? `สัญญาที่เริ่มงานตอนคิว${a.level} · 6 เดือนล่าสุด vs ย้อนหลัง 24 เดือนก่อนหน้า (${monthLabel(a.compRange.from)} – ${monthLabel(a.compRange.to)}) · ${levelsTxt}`
    : `6 เดือนล่าสุด vs 6 เดือนก่อนหน้า (${monthLabel(a.compRange.from)} – ${monthLabel(a.compRange.to)}) · เดือนที่ยังไม่จบนับถึงวันเดียวกัน`;
  return <section className={cn('dash-card onb-card onb-block', svc === 'ORM' ? 'is-orm' : 'is-mc')} data-testid={`sla-block-${svc}`}>
    <h3>{svc} · {a.current.length} สัญญา vs {a.comp.length} สัญญา</h3>
    <div className="onb-ctrl"><span className="cl-muted">ข้อมูลประกอบ · Go Live ใน 6 เดือนล่าสุด · เทียบกับ</span>
      <div className="sd-seg" role="group">{([['level', 'คิวระดับเดียวกัน (แนะนำ)'], ['prev', 'ช่วงก่อนหน้า (ความยาวเท่ากัน)']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={mode === k} className={cn(mode === k && 'is-on')} onClick={() => setMode(k)}>{l}</button>)}</div>
      {mode === 'level' && <><span className="cl-muted">ระดับคิวตอนเริ่มงาน</span><div className="sd-seg" role="group">{(['เบา', 'ปกติ', 'หนัก'] as Level[]).map((k) => <button key={k} type="button" aria-pressed={a.level === k} className={cn(a.level === k && 'is-on')} onClick={() => setLevel(k)}>{k} {a.levels[k]}</button>)}</div></>}
    </div>
    <p className="cl-muted text-xs">{desc}</p>
    <div className="sd-table-scroll"><table className="sd-table onb-settable">
      <thead><tr>{SLA_ONB.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{ROWS[svc].map((r) => {
        if (!r.key) return <tr key={r.label}><td>{r.label}</td><td><span className="onb-team">{r.team}</span></td><td>—</td><td>—</td><td colSpan={6} className="cl-muted">ไม่มีกำหนด · นับในเป้ารวม</td></tr>;
        const k = r.key; const t = draft[k]; const ok = validThr(t); const dirty = t.ok !== base[k].ok || t.due !== base[k].due;
        const cur = a.values(k, 'current'), cmp = a.values(k, 'comp');
        const nowPct = pctLe(cur, base[k].due), newPct = pctLe(cur, t.due), cmpPct = pctLe(cmp, t.due);
        const m = mostRange(cur), mc = mostRange(cmp); const fmt = (x: typeof m) => (!x ? '—' : x.a === x.b ? `${x.a}` : `${x.a}–${x.b}`);
        const capN = Math.min(24, t.due + 4); const maxV = Math.max(capN, ...cur, ...cmp, 1);
        const diff = newPct == null || cmpPct == null ? null : newPct - cmpPct;
        return <tr key={r.label} className={cn(r.total && 'is-total', dirty && 'is-dirty', !ok && 'is-bad')}>
          <td>{r.label}{k === 'p1' && <small className="cl-muted"> · ใช้ร่วมกับ {svc === 'ORM' ? 'Marcom' : 'ORM'}</small>}{!ok && <small className="onb-t-red" role="alert">{SLA_ONB.invalid}</small>}</td>
          <td><span className="onb-team">{r.team}</span></td>
          {(['ok', 'due'] as const).map((f) => <td key={f}><input type="number" min={0} max={60} disabled={!isPm} aria-label={`${svc} ${r.label} ${f === 'ok' ? 'ทันกำหนดถึง' : 'เลยเมื่อเกิน'}`} value={Number.isFinite(t[f]) ? t[f] : ''} onChange={(e) => set(k, f, e.target.value === '' ? Number.NaN : Number(e.target.value))} /> วัน</td>)}
          <td><div className="onb-mini">{ok && Array.from({ length: capN + 1 }, (_, d) => <i key={d} className={d <= t.ok ? 'is-green' : d <= t.due ? 'is-amber' : 'is-red'} />)}</div>{ok && <small className="cl-muted">เขียว 0–{t.ok} · เหลือง {t.ok + 1}–{t.due} · แดง &gt; {t.due}</small>}</td>
          <td><div className="onb-dist">{mc && <i className="is-cmp" style={{ left: `${(mc.a / maxV) * 100}%`, width: `${Math.max(2, ((mc.b - mc.a) / maxV) * 100)}%` }} />}{m && <i className="is-cur" style={{ left: `${(m.a / maxV) * 100}%`, width: `${Math.max(2, ((m.b - m.a) / maxV) * 100)}%` }} />}{ok && <><b className="is-ok" style={{ left: `${(t.ok / maxV) * 100}%` }} /><b className="is-due" style={{ left: `${(t.due / maxV) * 100}%` }} /></>}</div></td>
          <td>{fmt(m)} <small className="cl-muted">เดิม {fmt(mc)}</small></td>
          <td>{p80(cur) ?? '—'}</td>
          <td>{nowPct == null ? '—' : <><span className={`onb-pill onb-tone-${pctTone(nowPct)}`}>{nowPct}%</span>{newPct !== nowPct && <> → <span className={`onb-pill onb-tone-${pctTone(newPct)}`}>{newPct}%</span></>} <small className="cl-muted">{cur.filter((x) => x <= t.due).length}/{cur.length}</small></>}</td>
          <td>{diff == null ? '—' : diff > 0 ? <span className="onb-t-green">▲ {diff} จุด</span> : diff < 0 ? <span className="onb-t-red">▼ {-diff} จุด</span> : 'เท่าเดิม'}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <p className="cl-muted text-xs">{svc === 'ORM' ? 'งานเตรียมระบบของ Specialist และ ORM ทำพร้อมกันหลัง Approved · ผลรวมรายเฟสจึงไม่ต้องเท่าเป้ารวม · เป้ารวมนับรวมช่วงรอวันประชุม' : 'Specialist ฝั่ง Marcom ยังสงวนไว้ · ช่วงก่อน Go Live / รอวันประชุม ไม่รวม GMB'}</p>
  </section>;
}
