import { useState } from 'react';
import { ChartSkeleton, ChartTooltip, DashCard, Delta } from './dash-card';
import { Button } from '@/components/ui/button';
import type { ServicingRow } from '@/lib/servicing-dashboard-types';
import { median } from '@/lib/servicing-dashboard-types';
import { quantile } from '@/lib/ps-servicing';
import { calendarDays, shortThaiDate } from '@/lib/servicing-time';
import type { Period } from '@/lib/ps-dashboard-global';
const fmt=(n:number|null)=>n==null?'—':n.toLocaleString('th-TH',{maximumFractionDigits:1});
export function ServicingGoLiveChart({rows,service,periodA,periodB,compare,pending}: {rows:ServicingRow[];service:string;periodA:Period;periodB:Period;compare:boolean;pending:boolean}) {
 const [view,setView]=useState('ORM'),[hover,setHover]=useState<string|null>(null);
 const active=service==='Marcom'?'Marcom':service==='ORM'?'ORM':view;
 const select=(p:Period)=>rows.filter(r=>r.service_line===(active==='ORM'?'ORM':'MARCOM')&&r.go_live_at&&r.go_live_at.slice(0,10)>=p.from&&r.go_live_at.slice(0,10)<=p.to).map(r=>({...r,days:calendarDays(r.created_at,r.go_live_at??r.created_at),date:(r.go_live_at??'').slice(0,10)}));
 const a=select(periodA),b=compare?select(periodB):[],values=a.map(r=>r.days).sort((a,b)=>a-b),med=median(values),q1=values.length?quantile(values,.25):null,q3=values.length?quantile(values,.75):null,mb=median(b.map(r=>r.days));
 const all=[...a.map(r=>({...r,cohort:'A'})),...b.map(r=>({...r,cohort:'B'}))];
 const from=Date.parse(periodA.from),to=Date.parse(periodA.to),span=Math.max(86_400_000,to-from);
 const x=(date:string,cohort='A')=>cohort==='B'?76+(Date.parse(date)-Date.parse(periodB.from))/Math.max(86_400_000,Date.parse(periodB.to)-Date.parse(periodB.from))*880:76+(Date.parse(date)-from)/span*880;
 const maxY=Math.max(35,...all.map(r=>Math.ceil(r.days/7)*7)),y=(d:number)=>330-d/maxY*286;
 const dates=Array.from(new Set(all.map(r=>r.date))).sort(),group=all.filter(r=>r.date===hover).sort((a,b)=>b.days-a.days);
 const selected=group[0],hx=selected?x(selected.date,selected.cohort):0;
 const months:string[]=[];let cursor=new Date(`${periodA.from}T00:00:00Z`);cursor.setUTCDate(1);for(let i=0;i<24&&cursor.getTime()<=to;i++){months.push(cursor.toISOString().slice(0,10));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
 return <DashCard title="③ Overall days to Go-Live" question="สร้างการ์ด → Go Live ใช้กี่วัน? (รายการ์ด · รวมช่วงรอประชุม)" answer={med==null?'—':`${fmt(med)} วัน`} answerSub={<>{med!=null&&`median · ${active} · ${a.length} การ์ด`}{compare&&<div>A {fmt(med)} · B {fmt(mb)} · <Delta a={med} b={mb} lowerGood unit=" วัน"/></div>}</>} noteNamespace="servicing" noteKey="golive" noteLines={med==null?['ยังไม่มีข้อมูลพอสรุป']:[...(compare?[`A ${fmt(med)} · B ${fmt(mb)} · Δ ${med!=null&&mb!=null?fmt(med-mb):'—'} วัน`]:[]),`${active} ใช้ราว ${fmt(med)} วัน (median) · ครึ่งกลางอยู่ ${fmt(q1)}–${fmt(q3)} วัน`,...(a.length<30?['ฐานเล็ก: 1 การ์ดขยับค่ากลางได้ ให้ดูจำนวนประกอบ']:[])]} howToRead="1 จุด = 1 การ์ด · จุดยิ่งสูงยิ่งใช้เวลานาน · แถบจาง = ครึ่งกลางของการ์ดทั้งหมด · ไม่มีเส้น SLA รวม เพราะช่วงรอประชุมขึ้นกับลูกค้า">
 <div className="sv-controls" role="group" aria-label="Overall service">{['ORM','Marcom'].filter(v=>service==='ALL'||service===v).map(v=><Button key={v} size="sm" variant={active===v?'default':'ghost'} aria-pressed={active===v} onClick={()=>setView(v)}>{v}</Button>)}</div>
 {compare&&<p className="my-3 text-xs text-muted-foreground">A = Go Live {periodA.from}–{periodA.to} (จุดเต็ม) · B = {periodB.from}–{periodB.to} (จุดจาง · เส้นประ = median B)</p>}
 {pending||!a.length?<ChartSkeleton text="รอ source"/>:<div className={`sv-golive-plot ${active==='Marcom'?'sv-series-marcom':''}`}>
  <svg viewBox="0 0 1000 380" preserveAspectRatio="none" role="img" aria-label="Overall days to Go-Live">
  {Array.from({length:Math.floor(maxY/7)+1},(_,i)=>i*7).map(t=><g key={t}><line x1="76" x2="956" y1={y(t)} y2={y(t)} className="sv-grid-line"/><text x="62" y={y(t)+4} textAnchor="end" className="sv-axis-text">{t} {t===maxY?'วัน':''}</text></g>)}
  {q1!=null&&q3!=null&&<rect x="76" width="880" y={y(q3)} height={y(q1)-y(q3)} className="sv-iqr-band"/>}
  {med!=null&&<line x1="76" x2="956" y1={y(med)} y2={y(med)} className="sv-overall-median"/>}
  {mb!=null&&<line x1="76" x2="956" y1={y(mb)} y2={y(mb)} className="sv-compare-median"/>}
  {months.map(date=><text key={date} x={Math.max(76,x(date))} y="363" textAnchor="middle" className="sv-axis-text">{new Intl.DateTimeFormat('th-TH',{month:'short'}).format(new Date(date))}</text>)}
  {all.map((r,i)=><circle key={`${r.card_id}-${r.cohort}`} cx={x(r.date,r.cohort)+(all.slice(0,i).filter(p=>p.date===r.date&&p.days===r.days).length%3-1)*5} cy={y(r.days)} r={r.date===hover?9:7} className={`sv-overall-dot ${r.cohort==='B'?'sv-cohort-b':''}`}/>)}
  {selected&&<line x1={hx} x2={hx} y1="30" y2="334" className="sv-hover-line"/>}
  </svg>
  <div className="sv-overall-labels"><span>median {fmt(med)} วัน</span><span>ครึ่งกลาง {fmt(q1)}–{fmt(q3)} วัน</span></div>
  {dates.map(date=>{const r=all.find(r=>r.date===date);if(!r)return null;return <Button key={date} variant="ghost" aria-label={`Go Live ${shortThaiDate(date)}`} className="sv-day-hit" style={{left:`${x(date,r.cohort)/10}%`}} onMouseEnter={()=>setHover(date)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(date)} onBlur={()=>setHover(null)} onClick={()=>setHover(hover===date?null:date)}/>;})}
  {selected&&<div className={`sv-day-tooltip ${hx>620?'sv-tooltip-left':''}`} style={{left:`${hx/10}%`}}><ChartTooltip header={`${shortThaiDate(selected.date)} · Go Live ${group.length} การ์ด${group.length>1?` · median ${fmt(median(group.map(r=>r.days)))} วัน`:''}`} lines={[...group.slice(0,group.length>3?2:3).map(r=>`${r.hotel_name} · ${r.owner_label??(r.service_line==='ORM'?`ORM Team ${r.orm_team}`:`Marcom ${r.marcom_owner_id}`)} · ${r.days} วัน${compare?` · cohort ${r.cohort}`:''}`),...(group.length>3?[`+${group.length-2} การ์ด`]:[])]}/></div>}
 </div>}
 </DashCard>;
}