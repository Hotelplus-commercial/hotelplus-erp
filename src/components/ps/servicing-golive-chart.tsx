import { useEffect, useState } from 'react';
import { ChartSkeleton, ChartTooltip, DashCard, Delta } from './dash-card';
import { usePlotSize } from './use-plot-size';
import { Button } from '@/components/ui/button';
import type { ServicingRow } from '@/lib/servicing-dashboard-types';
import { median } from '@/lib/servicing-dashboard-types';
import { quantile } from '@/lib/ps-servicing';
import { calendarDays, shortThaiDate } from '@/lib/servicing-time';
import type { Period } from '@/lib/ps-dashboard-global';
const fmt=(n:number|null)=>n==null?'—':n.toLocaleString('th-TH',{maximumFractionDigits:1});
export function ServicingGoLiveChart({rows,service,periodA,periodB,compare,pending}: {rows:ServicingRow[];service:string;periodA:Period;periodB:Period;compare:boolean;pending:boolean}) {
 const {ref,width,height}=usePlotSize();
 const [labelWidths,setLabelWidths]=useState<number[]>([]);
 const [view,setView]=useState('ORM'),[hover,setHover]=useState<string|null>(null);
 const active=service==='Marcom'?'Marcom':service==='ORM'?'ORM':view;
 const select=(p:Period)=>rows.filter(r=>r.service_line===(active==='ORM'?'ORM':'MARCOM')&&r.go_live_at&&r.go_live_at.slice(0,10)>=p.from&&r.go_live_at.slice(0,10)<=p.to).map(r=>({...r,days:calendarDays(r.created_at,r.go_live_at??r.created_at),date:(r.go_live_at??'').slice(0,10)}));
 const a=select(periodA),b=compare?select(periodB):[],values=a.map(r=>r.days).sort((a,b)=>a-b),med=median(values),q1=values.length?quantile(values,.25):null,q3=values.length?quantile(values,.75):null,mb=median(b.map(r=>r.days));
 const all=[...a.map(r=>({...r,cohort:'A'})),...b.map(r=>({...r,cohort:'B'}))];
 const from=Date.parse(periodA.from),to=Date.parse(periodA.to),span=Math.max(86_400_000,to-from);
 const left=48,right=Math.max(left,width-16),top=28,bottom=height-32,plotWidth=Math.max(1,right-left);
 const x=(date:string,cohort='A')=>left+(cohort==='B'?(Date.parse(date)-Date.parse(periodB.from))/Math.max(86_400_000,Date.parse(periodB.to)-Date.parse(periodB.from)):(Date.parse(date)-from)/span)*plotWidth;
 const largest=Math.max(0,...all.map(r=>r.days));
 const nextSeven=(Math.floor(largest/7)+1)*7,maxY=nextSeven+(nextSeven-largest<=2?7:0),y=(d:number)=>bottom-d/maxY*(bottom-top);
 const dates=Array.from(new Set(all.map(r=>r.date))).sort(),group=all.filter(r=>r.date===hover).sort((a,b)=>b.days-a.days);
 const selected=group[0],hx=selected?x(selected.date,selected.cohort):0;
 const months:{date:string;middle:number}[]=[];let cursor=new Date(`${periodA.from}T00:00:00Z`);cursor.setUTCDate(1);for(let i=0;i<24&&cursor.getTime()<=to;i++){const start=cursor.getTime();cursor.setUTCMonth(cursor.getUTCMonth()+1);months.push({date:new Date(start).toISOString().slice(0,10),middle:left+((Math.max(start,from)+Math.min(cursor.getTime(),to))/2-from)/span*plotWidth});}
 const points=all.map(r=>({...r,px:x(r.date,r.cohort),py:y(r.days)}));
 const clearLabel=(initial:number,yy:number,w:number,h:number)=>{
  const clamp=(v:number)=>Math.max(left,Math.min(right-w,v));
  const candidates=Array.from({length:21},(_,i)=>clamp(initial+(i===0?0:Math.ceil(i/2)*8*(i%2?1:-1))));
  return candidates.find(xx=>!points.some(p=>p.px+10>xx&&p.px-10<xx+w&&p.py+10>yy&&p.py-10<yy+h));
 };
 const medianText=`median ${fmt(med)} วัน`,iqrText=`ครึ่งกลาง ${fmt(q1)}–${fmt(q3)} วัน`,bText=`median B ${fmt(mb)} วัน`;
 useEffect(()=>{
  const context=document.createElement('canvas').getContext('2d');if(!context)return;
  const measure=()=>setLabelWidths([medianText,iqrText,bText].map((text,i)=>{context.font=`${i===1?'400 12px':'700 12.5px'} "IBM Plex Sans Thai", system-ui`;return context.measureText(text).width+(i===1?8:12);}));
  measure();void document.fonts.ready.then(measure);
 },[medianText,iqrText,bText]);
 const medWidth=labelWidths[0]??125,iqrWidth=labelWidths[1]??125,bWidth=labelWidths[2]??140;
 const medTop=y(med??0)-24,bandHeight=y(q1??0)-y(q3??0),bandLabelTop=bandHeight<18?y(q3??0)-20:(y(q1??0)+y(q3??0))/2-9;
 // Dense narrow plots may have no clear horizontal slot inside the band.
 const iqrTop=clearLabel(right-iqrWidth,bandLabelTop,iqrWidth,18)==null?y(q3??0)-22:bandLabelTop;
 return <DashCard title="③ Overall days to Go-Live" question="สร้างการ์ด → Go Live ใช้กี่วัน? (รายการ์ด · รวมช่วงรอประชุม)" answer={med==null?'—':`${fmt(med)} วัน`} answerSub={<>{med!=null&&`median · ${active} · ${a.length} การ์ด`}{compare&&<div>A {fmt(med)} · B {fmt(mb)} · <Delta a={med} b={mb} lowerGood unit=" วัน"/></div>}</>} noteNamespace="servicing" noteKey="golive" noteLines={med==null?['ยังไม่มีข้อมูลพอสรุป']:[...(compare?[`A ${fmt(med)} · B ${fmt(mb)} · Δ ${med!=null&&mb!=null?fmt(med-mb):'—'} วัน`]:[]),`${active} ใช้ราว ${fmt(med)} วัน (median) · ครึ่งกลางอยู่ ${fmt(q1)}–${fmt(q3)} วัน`,...(a.length<30?['ฐานเล็ก: 1 การ์ดขยับค่ากลางได้ ให้ดูจำนวนประกอบ']:[])]} howToRead="1 จุด = 1 การ์ด · จุดยิ่งสูงยิ่งใช้เวลานาน · แถบจาง = ครึ่งกลางของการ์ดทั้งหมด · ไม่มีเส้น SLA รวม เพราะช่วงรอประชุมขึ้นกับลูกค้า">
 <div className="sv-controls" role="group" aria-label="Overall service">{['ORM','Marcom'].filter(v=>service==='ALL'||service===v).map(v=><Button key={v} size="sm" variant={active===v?'default':'ghost'} aria-pressed={active===v} onClick={()=>setView(v)}>{v}</Button>)}</div>
 {compare&&<p className="my-3 text-xs text-muted-foreground">A = Go Live {periodA.from}–{periodA.to} (จุดเต็ม) · B = {periodB.from}–{periodB.to} (จุดจาง · เส้นประ = median B)</p>}
 {pending||!a.length?<ChartSkeleton text="รอ source"/>:<div ref={ref} className={`sv-golive-plot ${active==='Marcom'?'sv-series-marcom':''}`}>
  <svg width={width} height={height} role="img" aria-label="Overall days to Go-Live">
  {Array.from({length:Math.floor(maxY/7)+1},(_,i)=>i*7).map(t=><g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} className="sv-grid-line"/><text x={left-8} y={y(t)+4} textAnchor="end" className="sv-axis-text">{t}{t===maxY?' วัน':''}</text></g>)}
  {q1!=null&&q3!=null&&<rect x={left} width={plotWidth} y={y(q3)} height={bandHeight} className="sv-iqr-band"/>}
  {med!=null&&<line x1={left} x2={right} y1={y(med)} y2={y(med)} className="sv-overall-median"/>}
  {mb!=null&&<line x1={left} x2={right} y1={y(mb)} y2={y(mb)} className="sv-compare-median"/>}
  {months.map(({date,middle})=><text key={date} x={middle} y={height-8} textAnchor="middle" className="sv-axis-text">{new Intl.DateTimeFormat('th-TH',{month:'short'}).format(new Date(date))}</text>)}
  {points.map(r=><circle key={`${r.card_id}-${r.cohort}`} cx={r.px} cy={r.py} r={r.date===hover?9:7} className={`sv-overall-dot ${r.cohort==='B'?'sv-cohort-b':''}`}/>)}
  {selected&&<line x1={hx} x2={hx} y1={top} y2={bottom} className="sv-hover-line"/>}
  {med!=null&&<g transform={`translate(${clearLabel(left,medTop,medWidth,22)??left},${medTop})`}><rect width={medWidth} height={22} rx={4} className="sv-line-label-bg"/><text x={6} y={16} className="sv-median-label">{medianText}</text></g>}
  {q1!=null&&q3!=null&&<text x={(clearLabel(right-iqrWidth,iqrTop,iqrWidth,18)??right-iqrWidth)+4} y={iqrTop+13} className="sv-iqr-label">{iqrText}</text>}
  {mb!=null&&<g transform={`translate(${clearLabel(right-bWidth,y(mb)-24,bWidth,22)??right-bWidth},${y(mb)-24})`}><rect width={bWidth} height={22} rx={4} className="sv-line-label-bg"/><text x={6} y={16} className="sv-median-b-label">{bText}</text></g>}
  </svg>
  {dates.map(date=>{const r=all.find(r=>r.date===date);if(!r)return null;const px=x(date,r.cohort),nearest=Math.min(...dates.filter(d=>d!==date).map(d=>{const other=all.find(p=>p.date===d);return Math.abs(px-x(d,other?.cohort));}));return <Button key={date} variant="ghost" aria-label={`Go Live ${shortThaiDate(date)}`} className="sv-day-hit" style={{left:px,top,bottom:32,width:Math.max(16,Math.min(28,nearest))}} onMouseEnter={()=>setHover(date)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(date)} onBlur={()=>setHover(null)} onClick={()=>setHover(hover===date?null:date)}/>;})}
  {selected&&<div className={`sv-day-tooltip ${hx>width*.62?'sv-tooltip-left':''}`} style={{left:hx}}><ChartTooltip header={`${shortThaiDate(selected.date)} · Go Live ${group.length} การ์ด${group.length>1?` · median ${fmt(median(group.map(r=>r.days)))} วัน`:''}`} lines={[...group.slice(0,group.length>3?2:3).map(r=>`${r.hotel_name} · ${r.owner_label??(r.service_line==='ORM'?`ORM Team ${r.orm_team}`:`Marcom ${r.marcom_owner_id}`)} · ${r.days} วัน${compare?` · cohort ${r.cohort}`:''}`),...(group.length>3?[`+${group.length-2} การ์ด`]:[])]}/></div>}
 </div>}
 </DashCard>;
}