import { useState } from 'react';
import { ChartHint, ChartSkeleton, DashCard } from './dash-card';
import { Button } from '@/components/ui/button';
import type { PhaseTimeRow } from '@/lib/servicing-dashboard-types';
import { median } from '@/lib/servicing-dashboard-types';
import { phaseConfig, statusText, type Phase } from '@/lib/servicing-time';
import type { Period } from '@/lib/ps-dashboard-global';
const fmt=(n:number|null)=>n==null?'—':n.toLocaleString('th-TH',{maximumFractionDigits:1});
const pct=(n:number,N:number)=>N?Math.round(n/N*100):0;
type PlotRow={label:string;sub:string;phase:Phase;lane:string;reserved?:boolean;ormOnly?:boolean};
const plots:Record<string,PlotRow[]>={
 ORM:[{label:'P2 · ORM',sub:'Approved → สร้างนัดประชุม',phase:'P2',lane:'ORM'},{label:'P3 · ORM',sub:'วันประชุม → Go Live',phase:'P3',lane:'ORM'}],
 Marcom:[{label:'P2 · Marcom',sub:'MT → สร้างนัด · GMB → Go Live',phase:'P2',lane:'Marcom'},{label:'P3 · Marcom MT',sub:'วันประชุม → Go Live (GMB ไม่มีช่วงนี้)',phase:'P3',lane:'Marcom'}],
 PS:[{label:'P1 · AE',sub:'สร้างการ์ด → Approved',phase:'P1',lane:'AE'},{label:'P2 · Specialist (ORM)',sub:'Approved → ส่ง handover ครบ',phase:'P2',lane:'Specialist',ormOnly:true},{label:'P2 · Specialist (Marcom)',sub:'สงวนไว้ · รอ implement',phase:'P2',lane:'Specialist',reserved:true}],
};
const inPeriod=(r:PhaseTimeRow,p:Period)=>r.go_live_at.slice(0,10)>=p.from&&r.go_live_at.slice(0,10)<=p.to;
export function ServicingPhaseChart({rows,service,periodA,periodB,compare,pending,periodLabel}: {rows:PhaseTimeRow[];service:string;periodA:Period;periodB:Period;compare:boolean;pending:boolean;periodLabel:string}) {
 const [view,setView]=useState('ORM');
 const active=service==='Marcom'&&view==='ORM'?'Marcom':service==='ORM'&&view==='Marcom'?'ORM':view;
 const options=[...(service!=='Marcom'?['ORM']:[]),...(service!=='ORM'?['Marcom']:[]),'PS'];
 const definitions=plots[active]??[];
 const select=(d:PlotRow,period:Period)=>rows.filter(r=>inPeriod(r,period)&&r.phase===d.phase&&r.lane===d.lane&&(!d.ormOnly||r.service_variant==='ORM')&&(active!=='ORM'||r.service_variant==='ORM')&&(active!=='Marcom'||r.service_variant!=='ORM'));
 const a=definitions.filter(d=>!d.reserved).flatMap(d=>select(d,periodA)),b=definitions.filter(d=>!d.reserved).flatMap(d=>select(d,periodB));
 const ok=a.filter(r=>r.zone==='ok').length,red=a.filter(r=>r.zone==='red').length;
 const summaries:string[]=[];
 for(const d of definitions.filter(d=>!d.reserved)){
  const data=select(d,periodA),groups=Array.from(new Set(data.map(r=>r.owner_label))).map(owner=>{const group=data.filter(r=>r.owner_label===owner);return{owner,n:group.filter(r=>r.zone!=='ok').length,N:group.length};}).sort((a,b)=>b.n/b.N-a.n/a.N);
  const worst=groups[0];if(groups.length>=2&&worst&&worst.n>0)summaries.push(`${d.label}: ${worst.owner} ใกล้ครบหรือเกิน SLA มากสุด ${worst.n} จาก ${worst.N} โรงแรม`);
 }
 if(!summaries.length&&a.length)summaries.push('ทุกทีมเร็วกว่า SLA ทั้งหมดในมุมมองนี้');
 if(a.length&&summaries.length<2)summaries.push('ฐานเล็ก: 1 โรงแรมขยับ % ได้มาก ให้ดูจำนวนประกอบ');
 return <DashCard title="② เวลาราย owner เทียบ SLA" question={`แต่ละทีมใช้เวลาในช่วงของตัวเองกี่วัน? (การ์ดที่ Go Live ใน ${periodLabel} · แยก service line)`} answer={a.length?`${pct(ok,a.length)}%`:'—'} answerTone={red?'watch':'accent'} answerSub={a.length?`เร็วกว่า SLA ${ok} จาก ${a.length} · เกิน SLA ${red}${compare?` · B ${b.length?pct(b.filter(r=>r.zone==='ok').length,b.length)+'%':'—'}`:''}`:undefined} noteNamespace="servicing" noteKey="owner" noteLines={a.length?summaries:['ยังไม่มีข้อมูลพอสรุป']} howToRead="แต่ละแถว = 1 ช่วงงาน · 1 จุด = 1 โรงแรม · จุดบนพื้นขาว = เร็วกว่า SLA · ช่วงทำงานคู่ขนานกันจึงห้ามบวกรวม · ช่วงรอประชุมไม่อยู่ในแถวใด">
  <div className="sv-controls" role="group" aria-label="เวลาราย owner">{options.map(v=><Button key={v} size="sm" variant={active===v?'default':'ghost'} aria-pressed={active===v} onClick={()=>setView(v)}>{v==='PS'?'PS ทีม (AE / Specialist)':v}</Button>)}</div>
  {pending||!a.length?<ChartSkeleton text="รอ source"/>:<>
   <div className="sv-plot-legend">1 จุด = 1 โรงแรม · ชี้ที่จุดเพื่อดูชื่อโรงแรมและผู้ดูแล <span>median · เส้นเป้า</span><span className="sv-tone-ok">เร็วกว่า SLA</span><span className="sv-tone-amber">โซน amber · ใกล้ครบ SLA</span><span className="sv-tone-red">โซนแดง · เกิน SLA</span></div>
   <div className="sv-strip-axis"><span/><div>{[0,3,5,7,10,14].map(t=><span key={t} style={{left:`${t/16*100}%`}}>{t===14?'14+ วัน':t}</span>)}</div><span>เร็วกว่า SLA</span></div>
   {definitions.map(d=>{
    if(d.reserved)return <div className="sv-reserved" key={d.label}><span>{d.label} · สงวนไว้ · ยังไม่มี handover ของ Specialist ฝั่ง Marcom</span><strong>—</strong></div>;
    const data=select(d,periodA),other=compare?select(d,periodB):[],cfg=phaseConfig(d.phase),med=median(data.map(r=>r.days)),good=data.filter(r=>r.zone==='ok').length;
    const reference='target'in cfg?cfg.target:cfg.sla;
    return <div className="sv-strip-row" key={d.label}>
     <div><strong>{d.label}</strong><p>{d.sub}</p></div>
     <div className="sv-strip-plot" aria-label={d.label}>
      <div className="sv-zone-amber" style={{left:`${(cfg.ok_max+.5)/16*100}%`,width:`${(cfg.sla-cfg.ok_max)/16*100}%`}}/><div className="sv-zone-red" style={{left:`${(cfg.sla+.5)/16*100}%`,right:0}}/>
      {[0,3,5,7,10,14].map(t=><span className="sv-strip-grid" key={t} style={{left:`${t/16*100}%`}}/>)}
      <span className="sv-target-line" style={{left:`${(reference+.5)/16*100}%`}}><small>{'target'in cfg?'เป้า':'SLA'} {reference} วัน</small></span>
      {med!=null&&<span className="sv-median-line" style={{left:`${med/16*100}%`}}><small>median {fmt(med)} วัน</small></span>}
      {[...data.map(r=>({...r,cohort:'A'})),...other.map(r=>({...r,cohort:'B'}))].map((r,i,all)=>{
       const peers=all.slice(0,i).filter(p=>p.days===r.days).length;
       return <ChartHint key={`${r.card_id}-${r.cohort}`} header={r.hotel_name} lines={[`ผู้ดูแล: ${r.owner_label}${r.lane==='Marcom'?` (${r.service_variant==='MARCOM_GMB'?'GMB':'MT'})`:''}`,`${d.label} · ${r.days} วัน · ${r.zone==='amber'?'ใกล้ครบ SLA':statusText(d.phase,r.days)}`,...(compare?[`cohort ${r.cohort}`]:[])]}><Button variant="ghost" aria-label={`${r.hotel_name} ${d.label} ${r.days} วัน`} className={`sv-strip-dot sv-dot-${r.zone} ${r.cohort==='B'?'sv-cohort-b':''}`} style={{left:`calc(${Math.min(r.days,15)/16*100}% + ${Math.floor(peers/4)*14}px)`,top:`${31+(peers%4)*14}px`}}/></ChartHint>;
      })}
     </div>
     <div className={`sv-strip-score text-${data.some(r=>r.zone==='red')?'dash-action':data.some(r=>r.zone==='amber')?'dash-watch':'dash-good'}`}><strong>{good}/{data.length}</strong><p>โรงแรม {pct(good,data.length)}%</p></div>
    </div>;
   })}
   <h3 className="mt-6 text-sm font-semibold">{active==='ORM'?'แยกรายทีม ORM':active==='Marcom'?'แยกรายคน Marcom':'แยกรายคน PS ทีม'}</h3><p className="mt-1 text-xs text-muted-foreground">นับโรงแรม · % ต่อฐานของแต่ละทีม · ฐานเล็ก: 1 โรงแรมขยับ % ได้มาก ให้ดูจำนวนประกอบ</p>
   <div className="sv-breakdown-grid">{definitions.filter(d=>!d.reserved).map(d=>{
    const data=select(d,periodA),other=compare?select(d,periodB):[],owners=Array.from(new Set([...data,...other].map(r=>r.owner_label))).sort(),cfg=phaseConfig(d.phase);
    return <div key={d.label} className="sv-breakdown"><h4>{d.label} <span>· {d.sub}</span></h4><div className="sv-table-row sv-table-header"><span>{active==='ORM'?'ทีม':active==='Marcom'?'Marcom':d.lane}</span><span>เร็วกว่า SLA<small>≤ {cfg.ok_max} วัน</small></span><span>ใกล้ครบ SLA<small>{cfg.ok_max+1}–{cfg.sla} วัน</small></span><span>เกิน SLA<small>&gt; {cfg.sla} วัน</small></span><span>รวม</span></div>
    {[...owners,'รวม'].map(owner=>{const group=owner==='รวม'?data:data.filter(r=>r.owner_label===owner),baseB=owner==='รวม'?other:other.filter(r=>r.owner_label===owner);return <div key={owner} className={`sv-table-row ${owner==='รวม'?'sv-table-total':''}`}><span>{owner==='รวม'?owner:owner.replace(/^(ORM |Marcom |AE |Specialist )/,'')}</span>{(['ok','amber','red'] as const).map(zone=>{const n=group.filter(r=>r.zone===zone).length,m=baseB.filter(r=>r.zone===zone).length;return <ChartHint key={zone} header={`${owner} · ${d.label}`} lines={compare?[`A ${n}/${group.length} · B ${m}/${baseB.length} · Δ ${n-m}`]:[`${n}/${group.length} โรงแรม`]}><span tabIndex={0} className={`sv-text-${zone}`}>{n} ({pct(n,group.length)}%)</span></ChartHint>;})}<strong>{group.length} รร.</strong></div>;})}</div>;
   })}</div>
  </>}
 </DashCard>;
}