/* Task v2.1 — sparklines, ⑧ backlog history, ⑥ incoming by category, ⑦ team workload. Read-only presentation. */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartHint, ChartSkeleton, DashCard } from './dash-card';
import { usePlotSize } from './use-plot-size';
import type { Period } from '@/lib/ps-dashboard-global';
import type { Category, HotelCare } from '@/lib/task-tickets';
import type { WorkRow } from '@/lib/task-worklist';
import { backlogAsOf, categoryIncoming, historyPoints, periodStats, workload, type ActMap, type BacklogInput, type Point, type WorkDept } from '@/lib/task-history';
import { configAt } from '@/lib/task-config';

const thMonth = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('th-TH', { month: 'short', timeZone: 'UTC' });
const thDay = (date: string, year = true) => new Date(`${date}T00:00:00Z`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
export const monYY = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const fmt1 = (n: number | null) => (n == null ? '—' : n.toFixed(1));
export const periodMonths = (p: Period, now: string) => { const to = p.to < now.slice(0, 10) ? p.to : now.slice(0, 10); return (Date.parse(to) - Date.parse(p.from)) / (30.44 * 864e5); };

export function Sparkline({ values, tone, bRef }: { values: (number | null)[]; tone: string; bRef?: number | null }) {
  const nums = values.filter((v): v is number => v != null), max = Math.max(1, ...nums, bRef ?? 0), n = values.length;
  const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100), y = (v: number) => 26 - (v / max) * 24;
  const segs: string[][] = [[]];
  values.forEach((v, i) => { if (v == null) { segs.push([]); return; } segs[segs.length - 1]!.push(`${x(i)},${y(v)}`); });
  return <svg className={`task-spark task-spark-${tone}`} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2="100" y1="26" y2="26" className="task-spark-base" vectorEffect="non-scaling-stroke" />
    {bRef != null && <line x1="0" x2="100" y1={y(bRef)} y2={y(bRef)} className="task-spark-b" vectorEffect="non-scaling-stroke" />}
    {segs.filter(s => s.length).map((s, i) => s.length === 1 ? <circle key={i} cx={s[0]!.split(',')[0]} cy={s[0]!.split(',')[1]} r="1.5" fill="currentColor" /> : <polyline key={i} points={s.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
  </svg>;
}

/* ---------------- ⑧ ---------------- */
const DEPTS: [string, string][] = [['ALL', 'ทั้งหมด'], ['ORM', 'ORM'], ['MARCOM', 'Marcom'], ['PS', 'PS'], ['AC', 'AC'], ['BD', 'BD']];
export function BacklogHistoryCard({ inp, a, b, compare, earliest }: { inp: BacklogInput; a: Period; b: Period; compare: boolean; earliest?: string | undefined }) {
  const [dept, setDept] = useState('ALL');
  const maxMonths = configAt('history_daily_max_months', inp.now.slice(0, 10));
  const daily = periodMonths(a, inp.now) <= maxMonths;
  const pick = (pts: Point[]) => pts.map(p => { const bl = backlogAsOf(p.T, inp), d = bl.dept[dept]; return { p, k1: dept === 'ALL' ? bl.k1 : d ? d[0] + d[1] + d[2] : 0, k2: dept === 'ALL' ? bl.k2 : bl.k2ByDept[dept] ?? 0, cases: bl.k1Case, l0: bl.k1L0, th: bl.k2Threshold }; });
  const A = useMemo(() => pick(historyPoints(a, inp.now, daily ? 'day' : 'week', earliest)), [inp, a, daily, dept, earliest]); // eslint-disable-line react-hooks/exhaustive-deps
  const B = useMemo(() => (compare ? pick(historyPoints(b, inp.now, daily ? 'day' : 'week', earliest)) : []), [inp, b, compare, daily, dept, earliest]); // eslint-disable-line react-hooks/exhaustive-deps
  const box = usePlotSize(), ref = box.ref;
  const last = A.at(-1), lastB = B.at(-1), vals = A.map(r => r.k1), avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null, peak = vals.length ? Math.max(...vals) : null;
  const top = Math.max(4, Math.ceil(Math.max(1, ...A.flatMap(r => [r.k1, r.k2]), ...B.flatMap(r => [r.k1, r.k2])) / 4) * 4);
  const W = Math.max(1, box.width), H = 220, pad = { l: 30, r: 8, t: 8, b: 24 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, n = Math.max(A.length, 1);
  const X = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw), Y = (v: number) => pad.t + ih - (v / top) * ih;
  const path = (rows: typeof A, k: 'k1' | 'k2') => rows.map((r, i) => `${i ? 'L' : 'M'}${X(i)},${Y(r[k])}`).join(' ');
  // R-TREND by month-end values (A), R-MAX overdue.
  const monthEnds = A.filter((r, i) => r.p.isToday || A[i + 1]?.p.date.slice(0, 7) !== r.p.date.slice(0, 7));
  let up = 0, down = 0; for (let i = monthEnds.length - 1; i > 0; i--) { const d = monthEnds[i]!.k1 - monthEnds[i - 1]!.k1; if (d > 0 && !down) up++; else if (d < 0 && !up) down++; else break; }
  const k = up || down, seq = monthEnds.slice(-(k + 1)), k2max = A.length ? Math.max(...A.map(r => r.k2)) : 0;
  const notes = A.length ? [...(compare && last && lastB ? [`ticket ค้างสิ้นช่วง A ${last.k1} เทียบช่วง B ${lastB.k1} (${sign(last.k1 - lastB.k1)})`] : []), ...(k ? [`ticket ค้าง${up ? 'เพิ่ม' : 'ลดลง'}ต่อเนื่อง ${k} เดือน (${seq[0]?.k1} → ${seq.at(-1)?.k1})`] : []), ...(last && last.k2 === k2max && k2max > 0 ? [`ticket เลยกำหนด ${k2max} สูงสุดในรอบ ${monthEnds.length} เดือน`] : [])].slice(0, 2) : ['ยังไม่มีข้อมูลสำหรับสรุป'];
  const ticks = A.map((r, i) => ({ i, label: thMonth(r.p.date), key: r.p.date.slice(0, 7) })).filter((t, j, arr) => j === 0 || arr[j - 1]!.key !== t.key);
  return <DashCard title="⑧ ticket ค้างย้อนหลัง" question={`ticket ค้างเพิ่มหรือลดลงตั้งแต่เมื่อไหร่? (ทุก ticket · ${daily ? 'จุดรายวัน' : 'จุดสิ้นสัปดาห์'})`} answer={last ? last.k1 : '—'} answerSub={last ? `${last.p.isToday ? 'ค้าง ณ วันนี้' : `ค้าง ณ ${thDay(last.p.date, false)}`} · เฉลี่ย ${fmt1(avg)} · สูงสุด ${peak}` : 'รอข้อมูล'} answerTone="accent" noteNamespace="task" noteKey="backlog" noteLines={notes} howToRead={`1 จุด = ยอดค้าง ณ วันสุดท้ายของ${daily ? 'วัน' : 'สัปดาห์'} · ชี้เพื่อดูแยกสถานะและแหล่ง · เส้นประ = ช่วง B เมื่อเปิด Compare`}
    legend={<div className="task-legend task-backlog-legend"><span><i className="task-teal" />ticket เปิดทั้งหมด</span><span><i className="task-amber" />ticket เลยกำหนด</span>{compare && <span><i className="task-dashed" />ช่วง B (ช่วงก่อนหน้า)</span>}<div className="task-seg" role="group" aria-label="แผนก">{DEPTS.map(([k, l]) => <Button key={k} size="sm" variant={dept === k ? 'default' : 'ghost'} aria-pressed={dept === k} onClick={() => setDept(k)}>{l}</Button>)}</div></div>}>
    {A.length ? <div className="task-backlog-plot" ref={ref} style={{ height: H }}>
      {box.width > 0 && <svg width={W} height={H} aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => { const v = (top / 4) * i; return <g key={i}><line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} className="task-grid-line" /><text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" className="task-axis">{v}</text></g>; })}
        {ticks.map(t => <text key={t.key} x={X(t.i)} y={H - 6} textAnchor="middle" className="task-axis">{t.label}</text>)}
        {B.length > 0 && <><path d={path(B.slice(0, n), 'k1')} className="task-line-b1" /><path d={path(B.slice(0, n), 'k2')} className="task-line-b2" /></>}
        <path d={path(A, 'k1')} className="task-line-k1" /><path d={path(A, 'k2')} className="task-line-k2" />
      </svg>}
      <div className="task-hover-cols" style={{ left: pad.l - iw / Math.max(1, n - 1) / 2, width: iw + iw / Math.max(1, n - 1) }}>{A.map((r, i) => { const rb = B[i]; return <ChartHint key={r.p.date} header={`${daily ? (r.p.isToday ? 'วันนี้ ' : '') : r.p.isToday ? 'วันนี้ ' : 'สิ้นสัปดาห์ '}${thDay(r.p.date)}`} lines={[`ticket เปิด ${r.k1} · PS เปิดเอง ${r.cases} · อื่น ๆ ระบบ ${r.l0}`, `ticket เลยกำหนด ${r.k2} (เกณฑ์ ${r.th} วัน ณ วันนั้น)`, ...(rb ? [`ช่วง B จุดเดียวกัน: ticket เปิด ${rb.k1} · Δ ${sign(r.k1 - rb.k1)}`] : [])]}><button type="button" className="task-hover-col" aria-label={`${thDay(r.p.date)} งานเปิด ${r.k1}`} /></ChartHint>; })}</div>
    </div> : <ChartSkeleton />}
    <p className="task-footnote">ช่วงเวลาเกิน 3 เดือน จุด = สิ้นสัปดาห์ (ไม่เกิน 3 เดือน = รายวัน) · คำนวณย้อนจากประวัติสถานะ · เกินกำหนดใช้เกณฑ์ ณ วันนั้น</p>
  </DashCard>;
}

/* ---------------- ⑥ ---------------- */
const DOMAIN_LABEL: Record<string, string> = { ORM: 'ORM', MARCOM: 'Marcom', PS: 'PS', AC: 'AC' };
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export function CategoryIncomingCard({ rows, categories, a, b, compare }: { rows: WorkRow[]; categories: Category[]; a: Period; b: Period; compare: boolean }) {
  const A = categoryIncoming(rows, categories, a), B = compare ? categoryIncoming(rows, categories, b) : null;
  const [open, setOpen] = useState<string[]>([]);
  const top = A.domains[0], maxD = Math.max(1, ...A.domains.map(d => d.n), ...(B?.domains.map(d => d.n) ?? [])), maxT = Math.max(1, ...A.types.map(t => t.n), ...(B?.types.map(t => t.n) ?? []));
  const bD = (d: string) => B?.domains.find(x => x.domain === d)?.n ?? 0, bT = (t: string) => B?.types.find(x => x.type === t)?.n ?? 0;
  const delta = B ? [...A.domains].sort((x, y) => Math.abs(y.n - bD(y.domain)) - Math.abs(x.n - bD(x.domain)))[0] : null;
  const notes = top ? [...(delta && B ? [`${DOMAIN_LABEL[delta.domain]} เปลี่ยนมากสุด: A ${delta.n} · B ${bD(delta.domain)} · Δ ${sign(delta.n - bD(delta.domain))}`] : []), `${DOMAIN_LABEL[top.domain]} ${top.n} จาก ${A.psN} ticket PS เปิดเอง (${pct(top.n, A.psN)}%) · หมวดย่อยที่เข้ามากสุด: ${top.subs[0]?.label} ${top.subs[0]?.n}`, ...(A.types[0] ? [`ติดตามจากแท็บอื่น + ระบบสร้าง: ${A.types[0].label} ${A.types[0].n} จาก ${A.l0N} ใบ (${pct(A.types[0].n, A.l0N)}%)`] : [])].slice(0, 2) : ['ยังไม่มีข้อมูลสำหรับสรุป'];
  return <DashCard title="⑥ ticket ใหม่ตามหมวด" question="ลูกค้าแจ้งเรื่องอะไรบ่อย? (ticket ใหม่ในช่วงที่เลือก)" answer={top ? `${DOMAIN_LABEL[top.domain]} ${top.n}` : '—'} answerSub={top ? `หมวดที่เข้ามากสุด · จาก ${A.psN} ticket PS เปิดเอง` : 'รอข้อมูล'} answerTone="accent" noteNamespace="task" noteKey="category" noteLines={notes} howToRead="นับ ticket ใหม่ในช่วงเวลาที่เลือก ตามหมวดปัจจุบัน · ticket ที่ติดตามจากแท็บอื่นและระบบสร้างแยกกลุ่มเพราะไม่ได้มาจากลูกค้า">
    {A.psN + A.l0N ? <div className="task-cat">
      <p className="task-cat-group">PS เปิดเอง (ตามหมวด) · กดแถวเพื่อดูหมวดย่อย</p>
      {A.domains.map(d => { const ex = open.includes(d.domain); return <div key={d.domain}>
        <ChartHint header={`${DOMAIN_LABEL[d.domain]} · ${d.n} ticket (${pct(d.n, A.psN)}% ของ ticket PS เปิดเอง)`} lines={[`มากสุด: ${d.subs.slice(0, 2).map(s => `${s.label} ${s.n}`).join(' · ')}`, B ? `A ${d.n} · B ${bD(d.domain)} · Δ ${sign(d.n - bD(d.domain))}` : 'กดแถวเพื่อดูหมวดย่อยทั้งหมด']}>
          <button type="button" className="task-cat-row" aria-expanded={ex} onClick={() => setOpen(o => ex ? o.filter(x => x !== d.domain) : [...o, d.domain])}>{ex ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<span className="task-cat-name">{DOMAIN_LABEL[d.domain]}</span><span className="task-cat-track"><span className="task-cat-bar" style={{ width: `${(d.n / maxD) * 100}%` }} />{B && <span className="task-cat-bar task-cat-b" style={{ width: `${(bD(d.domain) / maxD) * 100}%` }} />}</span><span className="task-cat-val">{d.n} <small>{pct(d.n, A.psN)}%</small></span></button>
        </ChartHint>
        {ex && d.subs.map(s => <div key={s.code} className="task-cat-row task-cat-sub"><span /><span className="task-cat-name">{s.label}</span><span className="task-cat-track"><span className="task-cat-bar task-cat-light" style={{ width: `${(s.n / d.n) * 100}%` }} /></span><span className="task-cat-val">{s.n} <small>{pct(s.n, d.n)}%</small></span></div>)}
      </div>; })}
      <p className="task-cat-group task-cat-l0">ติดตามจากแท็บอื่น + ระบบสร้าง (ตามประเภท) · {A.l0N} ใบ · ระบบหรือ tab อื่นสร้าง ไม่ใช่ลูกค้าแจ้ง</p>
      {A.types.map(t => <ChartHint key={t.type} header={`${t.type} · ${t.n} ใบ (${pct(t.n, A.l0N)}%)`} lines={['ระบบหรือ tab อื่นเป็นผู้สร้าง', B ? `A ${t.n} · B ${bT(t.type)} · Δ ${sign(t.n - bT(t.type))}` : 'ไม่นับรวมในหมวดของ ticket ที่ PS เปิดเอง']}>
        <button type="button" className="task-cat-row"><span /><span className="task-cat-name">{t.label}</span><span className="task-cat-track"><span className="task-cat-bar task-cat-neutral" style={{ width: `${(t.n / maxT) * 100}%` }} />{B && <span className="task-cat-bar task-cat-neutral task-cat-b" style={{ width: `${(bT(t.type) / maxT) * 100}%` }} />}</span><span className="task-cat-val">{t.n} <small>{pct(t.n, A.l0N)}%</small></span></button>
      </ChartHint>)}
    </div> : <ChartSkeleton />}
  </DashCard>;
}

/* ---------------- ⑦ ---------------- */
const WDEPTS: [WorkDept, string][] = [['ORM', 'ORM'], ['MARCOM', 'Marcom'], ['PS', 'PS'], ['AC', 'AC'], ['BD', 'BD']];
export function WorkloadCard({ rows, acts, care, a, b, compare, people, smallBase }: { rows: WorkRow[]; acts: ActMap; care: HotelCare[]; a: Period; b: Period; compare: boolean; people: string[]; smallBase: number }) {
  const [dept, setDept] = useState<WorkDept>('ORM');
  const A = workload(dept, rows, acts, care, a, people), B = compare ? workload(dept, rows, acts, care, b, people) : [];
  const deptLabel = WDEPTS.find(d => d[0] === dept)![1], multi = A.length > 1, totalIn = A.reduce((n, r) => n + r.inN, 0);
  const top = [...A].sort((x, y) => y.inN - x.inN)[0], max = Math.max(1, ...A.flatMap(r => [r.inN, r.closedN]));
  const slow = [...A].filter(r => r.close.median != null).sort((x, y) => (y.close.median ?? 0) - (x.close.median ?? 0))[0];
  const notes = !A.length ? ['ยังไม่มีข้อมูลสำหรับสรุป'] : multi ? [`${top?.label} รับงานเข้า ${top?.inN} จาก ${totalIn} งานของ ${deptLabel}`, ...(slow ? [`ปิด ticket สุทธิ median ช้าสุด: ${slow.label} ${fmt1(slow.close.median)} วัน${slow.close.N < smallBase ? ` (ฐานเล็ก ${slow.close.N} งาน)` : ''}`] : [])] : [`${deptLabel} เข้า ${A[0]!.inN} · ปิด ${A[0]!.closedN} · ค้างตอนนี้ ${A[0]!.openNow}`];
  return <DashCard title="⑦ Workload ราย ทีม" question="แต่ละทีมรับ ticket เท่าไร ใช้เวลาเท่าไร? (ตามช่วงเวลาที่เลือก)" answer={top ? `${multi ? top.label : deptLabel} ${top.inN}` : '—'} answerSub={top ? (multi ? `รับ ticket เข้ามากสุด · ${fmt1(top.per10)} ต่อ 10 โรงแรม` : 'ticket ใหม่ในช่วงที่เลือก') : 'รอข้อมูล'} answerTone="accent" noteNamespace="task" noteKey="workload" noteLines={notes} howToRead="1 แถว = 1 ทีม · ดูรายคนได้ด้วย Person filter ด้านบน · ticket นับให้ทีมของผู้รับผิดชอบ ณ ตอนสร้าง · วัดเวลาที่ทีมกดรับ/ปิด ticket ในระบบ ไม่ใช่เวลาที่ลูกค้าได้คำตอบจริง"
    legend={<div className="task-legend task-backlog-legend"><div className="task-seg" role="group" aria-label="แผนก">{WDEPTS.map(([k, l]) => <Button key={k} size="sm" variant={dept === k ? 'default' : 'ghost'} aria-pressed={dept === k} onClick={() => setDept(k)}>{l}</Button>)}</div><span><i className="task-teal" />เข้า</span><span><i className="task-neutral" />ปิด</span></div>}>
    {A.length ? <div className="task-wl-scroll"><div className="task-wl">
      <div className="task-wl-row task-wl-head"><span>ทีม</span><span>เข้า / ปิด</span><span>ค้างตอนนี้</span><span>รับงาน (median)</span><span>ปิด ticket สุทธิ (median)</span><span>เข้า / 10 โรงแรม</span></div>
      {A.map(r => { const rb = B.find(x => x.key === r.key); return <ChartHint key={r.key} header={`${r.label} · เข้า ${r.inN} · ปิด ${r.closedN} · ค้างตอนนี้ ${r.openNow}`} lines={[dept === 'BD' ? 'ticket ไม่ผูกพอร์ตโรงแรม (ไม่คำนวณต่อ 10 โรงแรม)' : `ดูแล ${r.hotels ?? 0} โรงแรม · เข้า ${fmt1(r.per10)} งานต่อ 10 โรงแรม`, `รับงาน วัดได้ ${r.accept.n}/${r.accept.N} · ปิดงาน วัดได้ ${r.close.n}/${r.close.N} · เปิดซ้ำหลังปิด ${r.reopen ? `${r.reopen.n}/${r.reopen.N}` : '—'}${r.backfill ? ` · รวมข้อมูลเติมย้อนหลัง ${r.backfill} งาน` : ''}`, ...(rb ? [`ช่วง B: เข้า ${rb.inN} · ปิด ${rb.closedN} · รับงาน ${fmt1(rb.accept.median)} วัน · ปิดงาน ${fmt1(rb.close.median)} วัน`] : [])]}>
        <button type="button" className="task-wl-row"><span className="font-semibold">{r.label}</span><span className="task-wl-bars"><span><i className="task-teal" style={{ width: `${(r.inN / max) * 100}%` }} /><b>{r.inN}</b></span><span><i className="task-neutral" style={{ width: `${(r.closedN / max) * 100}%` }} /><b>{r.closedN}</b></span></span><span className="text-right font-semibold">{r.openNow}</span><span className="task-wl-num">{r.accept.median == null ? '—' : `${fmt1(r.accept.median)} วัน`}</span><span className="task-wl-num">{r.close.median == null ? '—' : `${fmt1(r.close.median)} วัน`}</span><span className="task-wl-num">{dept === 'BD' ? '—' : fmt1(r.per10)}</span></button>
      </ChartHint>; })}
    </div></div> : <ChartSkeleton />}
    <p className="task-footnote">เวลาเป็น median หน่วยวัน · สีกลางจนกว่าจะกำหนดเกณฑ์รายหมวด · ปิด ticket สุทธิไม่นับช่วงสถานะ "รอ" · ชี้แถวเพื่อดูจำนวน ticket ที่วัดได้</p>
  </DashCard>;
}
export { periodStats };
