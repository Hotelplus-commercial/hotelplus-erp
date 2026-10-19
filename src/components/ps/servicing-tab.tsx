/* Servicing v2 cockpit: projections only; operational writes stay in the guided drawer/assignment master. */
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useRef, useState } from 'react';
import { plainSv } from '@/lib/ps-glossary';
import { servicingInfo } from './servicing-phase-chart';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AssignDialog } from './assignment-ui';
import { ServicingCardDrawer } from './servicing-dashboard';
import { OnboardingCardContent } from './onboarding-card';
import { ChartHint, ChartSkeleton, DashCard } from './dash-card';
import { ServicingPhaseChart } from './servicing-phase-chart';
import { ServicingGoLiveChart } from './servicing-golive-chart';
import { useHrMembers, type AssignType } from '@/lib/hr-members';
import { selectedPeriod, useDashboardGlobal } from '@/lib/ps-dashboard-global';
import { useServicing } from '@/lib/ps-servicing';
import { readServicingDashboard } from '@/lib/servicing-dashboard.functions';
import { assignmentComplete, missingCaretakers, servicingScope, servicingStats, type CaretakerSlot, type ServicingReport, type ServicingRow } from '@/lib/servicing-dashboard-types';
import { demoServicingRows, demoServicingPhases, SERVICING_DEMO_NOW } from '@/lib/servicing-demo';
import { calendarDays, cardStatus, MARCOM_REPORT_STAGES, ORM_REPORT_STAGES, reportStageLabel, servicingLanes, servicing_sla_config, shortThaiDate, statusText, stallEventKey, type ServicingLane } from '@/lib/servicing-time';
import { createServicingStall, stallRouting } from '@/lib/servicing-stall';
import { OPEN_STATUSES, STATUS_TH, SYSTEM_CREATOR, useTickets, type L0Ticket } from '@/lib/tickets-l0';
const SLOT_LABEL:Record<CaretakerSlot,string>={AE:'AE',SPECIALIST:'Specialist',ORM:'ORM team',MARCOM:'Marcom'};
const stageName=(s:string)=>plainSv(reportStageLabel(s));
const stageKey=(r:ServicingRow)=>r.current_stage==='completed'?'completed_handover':r.current_stage==='go_live'?(r.service_line==='ORM'?'orm_go_live':'marcom_go_live'):r.current_stage;
const ownerClass=(stage:string,line:string)=>['new_property','introduction_sent_form','collect_data','property_pending','final_check'].includes(stage)?'sv-owner-ae':['approved','completed_handover'].includes(stage)?'sv-owner-specialist':line==='ORM'?'sv-owner-orm':'sv-owner-marcom';
export function ServicingTab() {
 const {filter,demo}=useDashboardGlobal(),s=useServicing(),read=useServerFn(readServicingDashboard),tickets=useTickets();
 const real=useQuery({queryKey:['servicing-dashboard-views-v2'],queryFn:()=>read(),enabled:!demo,staleTime:60_000});
 const fixture=useMemo(()=>({rows:demoServicingRows(),phaseRows:demoServicingPhases(),pending:false,demo:true}),[]);
 const report:ServicingReport|undefined=demo?fixture:real.data;
 const [overlay,setOverlay]=useState<Record<string,Partial<ServicingRow>>>({}),[assignRow,setAssignRow]=useState<ServicingRow|null>(null),[drawer,setDrawer]=useState<string|null>(null),[drill,setDrill]=useState('flag'),[optimisticTickets,setOptimisticTickets]=useState<L0Ticket[]>([]);
 const [drillOpen,setDrillOpen]=useState(false);
 const drillHeader=useRef<HTMLElement>(null);
 const drillListId='servicing-drill-rows';
 useEffect(()=>{try{setDrillOpen(localStorage.getItem('psdash.drill.servicing.open')==='true');}catch{setDrillOpen(false);}},[]);
 const changeDrillOpen=(value:boolean)=>{setDrillOpen(value);try{localStorage.setItem('psdash.drill.servicing.open',String(value));}catch{/* unavailable storage is non-fatal */}};
 const selectDrill=(value:string,scroll=false)=>{
  setDrill(value);changeDrillOpen(true);
  if(scroll)requestAnimationFrame(()=>{const header=drillHeader.current;if(!header)return;const box=header.getBoundingClientRect();if(box.top<0||box.bottom>window.innerHeight)header.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 };
 useEffect(()=>{setOverlay({});setOptimisticTickets([]);setDrill('flag');},[demo]);
 const clock=demo?SERVICING_DEMO_NOW:new Date().toISOString(),periodA=selectedPeriod(filter,new Date(clock)),periodB=selectedPeriod(filter,new Date(clock),'B');
 const rows=servicingScope((report?.rows??[]).filter(r=>r.service_variant!=null).map(r=>({...r,...overlay[r.card_id]})),filter).filter(r=>!r.go_live_at||(r.go_live_at.slice(0,10)>=periodA.from&&r.go_live_at.slice(0,10)<=periodA.to));
 const lanes=(r:ServicingRow)=>r.lanes??servicingLanes(r,clock),status=(r:ServicingRow)=>cardStatus(lanes(r)),stats=servicingStats(rows),inProgress=rows.filter(r=>!r.go_live_at),red=inProgress.filter(r=>status(r).tone==='red').length,amber=inProgress.filter(r=>status(r).tone==='amber').length,gaps=rows.filter(r=>!assignmentComplete(r));
 const demoBadges=useMemo(()=>{
  return fixture.rows.filter(r=>['c3','c9','c15'].includes(r.card_id)).map((r,i)=>{const cause=cardStatus(servicingLanes(r,SERVICING_DEMO_NOW)).cause;if(!cause)return null;const routing=stallRouting(cause);return {ticket_id:`TKT-SV-DEMO-${i+1}`,type:'SERVICING_STALL',target_dept:routing.target_dept,created_by:SYSTEM_CREATOR,source_app:'PS_DASHBOARD_BOT',subject_ref:{card_id:r.card_id,hotel_id:r.hotel_id,hotel_name:r.hotel_name,gap_service:''},payload:{readiness_tier:'',chips:[],note:'',event_key:stallEventKey(r.card_id,cause),recipient:routing.recipient},status:(['ACK','NEW','IN_PROGRESS'] as const)[i],created_at:SERVICING_DEMO_NOW,revision:0,audit:[]} as L0Ticket;}).filter((t):t is L0Ticket=>t!=null);
 },[fixture]);
 const allTickets=demo?[...demoBadges,...optimisticTickets]:tickets;
 const openTicket=(r:ServicingRow)=>allTickets.find(t=>t.type==='SERVICING_STALL'&&t.subject_ref.card_id===r.card_id&&OPEN_STATUSES.includes(t.status));
 const pending=!demo&&(report?.pending??true);
 const selected=drill==='gap'?gaps:drill==='flag'?inProgress.filter(r=>['red','amber'].includes(status(r).tone??'')):rows.filter(r=>`${r.service_line}:${stageKey(r)}`===drill);
 const order:Record<string,number>={red:0,amber:1,ok:2,wait:3};
 const sorted=[...selected].sort((a,b)=>(order[status(a).tone??'wait']??4)-(order[status(b).tone??'wait']??4)||calendarDays(b.created_at,b.go_live_at??clock)-calendarDays(a.created_at,a.go_live_at??clock));
 const periodLabel=filter.range==='mtd'?'เดือนนี้':filter.range==='all'?'ช่วงเวลาทั้งหมด':filter.range==='custom'?`${filter.customPeriod?.from ?? ''} – ${filter.customPeriod?.to ?? ''}`:`${filter.range.replace('m','')} เดือนล่าสุด`;
 const open=(r:ServicingRow)=>{if(demo){toast.info('DEMO · ไม่มีการ์ดจริงให้เปิด');return;}if(!s.cards.some(c=>c.id===r.card_id)){toast.info('ยังไม่พบการ์ดนี้ในเครื่องนี้ · เปิดที่ On-boarding Process');return;}setDrawer(r.card_id);};
 const create=(r:ServicingRow)=>{
  const cause=status(r).cause;if(!cause||openTicket(r))return;
  const routing=stallRouting(cause);
  if(demo){const ticket:L0Ticket={ticket_id:`TKT-SV-${optimisticTickets.length+1}`,type:'SERVICING_STALL',target_dept:routing.target_dept,created_by:'PM',source_app:'PS_DASHBOARD',subject_ref:{card_id:r.card_id,hotel_id:r.hotel_id,hotel_name:r.hotel_name,gap_service:''},payload:{readiness_tier:'',chips:[],note:'',event_key:stallEventKey(r.card_id,cause),recipient:routing.recipient},status:'NEW',created_at:clock,revision:0,audit:[]};setOptimisticTickets(t=>[...t,ticket]);toast.success(`สร้าง Ticket #${ticket.ticket_id} แล้ว · ส่งถึง ${routing.recipient} (ต้องกด ACK)${routing.target_dept!=='PS'?' · PM เห็นสถานะในฐานะ watcher':''}`);return;}
  const result=createServicingStall(r,cause);toast.success(`สร้าง Ticket #${result.ticket_id} แล้ว · ส่งถึง ${routing.recipient} (ต้องกด ACK)${routing.target_dept!=='PS'?' · PM เห็นสถานะในฐานะ watcher':''}`);
 };
 const counts=(at:ServicingRow[])=>({ok:at.filter(r=>status(r).tone==='ok').length,amber:at.filter(r=>status(r).tone==='amber').length,red:at.filter(r=>status(r).tone==='red').length,wait:at.filter(r=>status(r).tone==='wait').length});
 const stageGroups=Array.from(new Set(inProgress.map(r=>`${r.service_line}:${stageKey(r)}`))).map(key=>({key,n:inProgress.filter(r=>`${r.service_line}:${stageKey(r)}`===key).length})).sort((a,b)=>b.n-a.n),most=stageGroups[0];
 const phaseRows=(report?.phaseRows??[]).filter(p=>rows.some(r=>r.card_id===p.card_id)||(!filter.compare?false:servicingScope(report?.rows??[],filter).some(r=>r.card_id===p.card_id)));
 return <section className="sv-cockpit space-y-4" aria-label="Servicing">
 {demo&&<p className="sv-demo-mark">DEMO · 17 ต.ค. 2026</p>}
 <div className="sv-stats">{[
  ['การ์ดบริการทั้งหมด',stats.cards,'หลัง filter'],['โรงแรม',stats.hotels,'นับโรงแรมละ 1'],['Go Live',stats.goLive,`ORM ${rows.filter(r=>r.go_live_at&&r.service_line==='ORM').length} · Marcom ${rows.filter(r=>r.go_live_at&&r.service_line==='MARCOM').length}`],['กำลังดำเนินการ',stats.inProgress,`เลยกำหนด ${red} · ใกล้ถึงกำหนด ${amber}`],['⚠ รอระบุผู้ดูแล',stats.awaiting,'ORM team / Marcom ยังว่าง']
 ].map(([label,value,sub],i)=><div className={`sv-stat ${i===4?'sv-stat-gap':''}`} key={label}><span>{label}</span><strong>{pending?'—':value}</strong><small>{pending?'รอ source':sub}</small>{i===4&&<Button variant="outline" size="sm" disabled={pending} onClick={()=>selectDrill('gap')}>+ ระบุผู้ดูแล</Button>}</div>)}</div>
 {real.isError&&!demo&&<p className="text-sm text-destructive">อ่านรายงาน Servicing ไม่สำเร็จ</p>}
 <DashCard info={servicingInfo()} title="① Pipeline ตอนนี้" question="การ์ดอยู่ stage ไหน และใบไหนใกล้ถึงหรือเลยกำหนดแล้ว? (1 การ์ด = 1 บริการ)" answer={pending?'—':`${stats.inProgress} การ์ด`} answerSub={pending?undefined:<><span className="sv-text-red">เลยกำหนด {red} · ใกล้ถึงกำหนด {amber}</span><div>กำลังดำเนินการ (ยังไม่ Go Live)</div></>} noteNamespace="servicing" noteKey="pipe" noteLines={pending?['ยังไม่มีข้อมูลพอสรุป']:[`เลยกำหนด ${red} · ใกล้ถึงกำหนด ${amber} จาก ${stats.inProgress} การ์ดที่กำลังดำเนินการ`,...(most?[`stage ที่มีการ์ดมากสุดตอนนี้: ${stageName(most.key.split(':')[1]??'')} (${most.key.split(':')[0]==='ORM'?'ORM':'Marcom'}) ${most.n} การ์ด`]:[])]} howToRead="ตัวเลขในช่อง = จำนวนการ์ดที่อยู่ stage นั้นตอนนี้ · แถบสีใต้ตัวเลข = สัดส่วนทันกำหนด / ใกล้ถึงกำหนด / เลยกำหนด · ชี้เพื่อดูรายละเอียด คลิกเพื่อดูรายการ์ด">
 {filter.compare&&<p className="mb-3 text-xs text-muted-foreground">Pipeline เป็นภาพปัจจุบัน จึงไม่เทียบ A vs B · การเทียบดูได้ที่การ์ด ② และ ③</p>}
 {pending?<ChartSkeleton text="รอ Cloud Sync seed"/>:<>
 {(['ORM','MARCOM'] as const).filter(l=>filter.service==='ALL'||filter.service===(l==='ORM'?'ORM':'Marcom')).map(line=><div className="sv-pipeline-lane" key={line}><h3>{line==='ORM'?'ORM · Final Setup (รอ handover ก่อน Training)':'Marcom · GMB ข้าม First Sync · First Sync นับ MT เท่านั้น'}</h3><div className="sv-pipeline-scroll"><div className="sv-pipeline-grid" style={{gridTemplateColumns:`repeat(${line==='ORM'?12:10},minmax(96px,1fr))`}}>{(line==='ORM'?ORM_REPORT_STAGES:MARCOM_REPORT_STAGES).map(stage=>{
 const at=rows.filter(r=>r.service_line===line&&stageKey(r)===stage&&(stage!=='marcom_first_sync'||r.service_variant==='MARCOM_META_TIKTOK')),c=counts(at),live=stage.endsWith('go_live'),key=`${line}:${stage}`,oldest=[...at].sort((a,b)=>calendarDays(b.stage_entered_at??b.created_at,clock)-calendarDays(a.stage_entered_at??a.created_at,clock))[0];
 return <ChartHint key={stage} header={`${stageName(stage)} · ${line==='ORM'?'ORM':'Marcom'} · ${at.length} การ์ด`} lines={!at.length?['ไม่มีการ์ดใน stage นี้']:live?[`Go Live แล้ว ${at.length} การ์ด`]:[`ทันกำหนด ${c.ok} · ใกล้ถึงกำหนด ${c.amber} · เลยกำหนด ${c.red}${c.wait?` · รอ ${c.wait}`:''}`,oldest?`ค้าง stage นี้นานสุด ${calendarDays(oldest.stage_entered_at??oldest.created_at,clock)} วัน · ${oldest.hotel_name}`:'',...(!at.every(assignmentComplete)?[`รอระบุผู้ดูแล ${at.filter(r=>!assignmentComplete(r)).length} การ์ด`]:[])]}><Button variant="ghost" className={`sv-stage-cell ${drill===key?'sv-selected':''}`} aria-pressed={drill===key} onClick={()=>selectDrill(key,true)}><span className={`sv-stage-owner-bar ${ownerClass(stage,line)}`}/><span className="sv-stage-label">{stageName(stage)}</span><strong className={!at.length?'sv-zero':''}>{at.length}</strong><span className="sv-proportion">{live?<i className="sv-dot-wait" style={{width:'100%'}}/>:(['ok','amber','red','wait'] as const).map(t=><i key={t} className={`sv-dot-${t}`} style={{width:`${at.length?c[t]/at.length*100:0}%`}}/>)}</span><small className={c.red?'sv-text-red':c.amber?'sv-text-amber':''}>{live?periodLabel:c.red?`เลยกำหนด ${c.red}`:c.amber?`ใกล้ถึงกำหนด ${c.amber}`:c.wait?`รอประชุม ${c.wait}`:' '}</small></Button></ChartHint>;
 })}</div></div></div>)}
 <div className="sv-drill"><header ref={drillHeader}>
 <Button variant="ghost" className="sv-drill-toggle" aria-expanded={drillOpen} aria-controls={drillListId} onClick={()=>changeDrillOpen(!drillOpen)}>
 <span className={`sv-drill-chevron ${drillOpen?'sv-drill-chevron-open':''}`} aria-hidden="true">▸</span><span className="sv-drill-heading"><span className="sv-drill-title">{drill==='flag'?`การ์ดที่ต้องจับตา · ${selected.length} การ์ด`:drill==='gap'?`รอระบุผู้ดูแล · ${selected.length} การ์ด`:`${stageName(drill.split(':')[1]??'')} · ${drill.split(':')[0]==='ORM'?'ORM':'Marcom'} · ${selected.length} การ์ด`}</span>
 {!drillOpen&&<span className="sv-drill-counts">{drill==='gap'?`ORM ${selected.filter(r=>r.service_line==='ORM').length} · Marcom ${selected.filter(r=>r.service_line==='MARCOM').length}`:<>{counts(selected).red>0&&<span className="sv-text-red">เลยกำหนด {counts(selected).red}</span>}{counts(selected).amber>0&&<span className="sv-text-amber">{counts(selected).red>0?' · ':''}ใกล้ถึงกำหนด {counts(selected).amber}</span>}</>}</span>}
 <span className="sv-drill-subtitle">{drill==='flag'?'เรียงเลยกำหนดก่อน แล้วใกล้ถึงกำหนด · คลิกช่อง stage เพื่อดูการ์ดใน stage นั้น':drill==='gap'?'ORM ต้องมี AE + Specialist + ORM team · Marcom ต้องมี AE + Specialist + Marcom':'ค้าง stage นี้ X วัน · Day N นับจากสร้างการ์ด'}</span></span></Button>
 <div className="sv-controls"><Button variant={drill==='flag'?'default':'outline'} size="sm" onClick={()=>selectDrill('flag')}>ต้องจับตา (ใกล้ถึง + เลยกำหนด) {red+amber}</Button><Button variant="outline" size="sm" onClick={()=>selectDrill('gap')}>รอระบุผู้ดูแล {gaps.length}</Button><Button variant="link" size="sm" aria-expanded={drillOpen} aria-controls={drillListId} onClick={()=>changeDrillOpen(!drillOpen)}>{drillOpen?'ซ่อนรายการ์ด':'ดูรายการ์ด'}</Button></div></header>
 <div id={drillListId} hidden={!drillOpen}>
 {sorted.map(r=>{
 const st=status(r),ticket=openTicket(r),live=Boolean(r.go_live_at);
 return <article className="sv-drill-row" key={r.card_id} data-card-id={r.card_id}><div className="min-w-0 flex-1"><OnboardingCardContent row={r} form={!live}>
 <span className="sv-card-meta"><span className={`sv-service-chip ${r.service_line==='ORM'?'sv-orm-chip':'sv-marcom-chip'}`}>{r.service_variant==='ORM'?'ORM':r.service_variant==='MARCOM_GMB'?'Marcom GMB':'Marcom MT'}</span><span>{stageName(stageKey(r))}</span>{!live&&<span className={`sv-lane-pill sv-tone-${st.tone??'wait'}`}>{st.label}</span>}</span>
 {live?<span className="block text-xs">Go Live {shortThaiDate(r.go_live_at??clock)} · ใช้ทั้งหมด {calendarDays(r.created_at,r.go_live_at??clock)} วัน (สร้างการ์ด → Go Live)</span>:<><span className="sv-lane-pills">{lanes(r).map((l,i)=><LanePill key={i} lane={l} gmb={r.service_variant==='MARCOM_GMB'}/>)}</span><span className="block text-xs text-muted-foreground">ค้าง stage นี้ {calendarDays(r.stage_entered_at??r.created_at,clock)} วัน · Day {calendarDays(r.created_at,clock)}{r.progress_total?` · ${r.progress_done} of ${r.progress_total} tasks · updated ${r.last_updated??'—'}`:''}</span><span className="block text-xs">AE {r.ae_owner_id??'รอระบุ'} · Specialist {r.specialist_id??'รอระบุ'} · <span className={!(r.orm_team??r.marcom_owner_id)?'sv-tone-amber':''}>{r.service_line==='ORM'?`ORM ${r.orm_team?'Team '+r.orm_team:': รอระบุ'}`:`Marcom ${r.marcom_owner_id??': รอระบุ'}`}</span></span></>}
 </OnboardingCardContent></div>{!live&&<div className="sv-row-actions">{ticket?<span className="sv-ticket-badge">#{ticket.ticket_id} · {STATUS_TH[ticket.status]} · ส่งถึง {ticket.payload.recipient??ticket.target_dept} · สร้างโดย {ticket.created_by===SYSTEM_CREATOR?'BOT':'PM'}</span>:filter.role==='PM'&&['red','amber'].includes(st.tone??'')&&<Button variant="outline" size="sm" className="sv-ticket-create" onClick={()=>create(r)}>+ สร้าง Ticket ติดตาม</Button>}<Button variant="outline" size="sm" className={!assignmentComplete(r)?'sv-assignment-gap':''} onClick={()=>setAssignRow(r)}>ระบุผู้ดูแล</Button><Button size="sm" onClick={()=>open(r)}>ดูรายละเอียด</Button></div>}</article>;
 })}
 {!selected.length&&<p className="p-5 text-center text-sm text-muted-foreground">ไม่มีการ์ดในกลุ่มนี้ตาม filter ปัจจุบัน · คลิกช่อง stage ด้านบนเพื่อดูการ์ด</p>}
 </div></div></>}
 {drillOpen&&<p className="mt-3 text-xs text-muted-foreground">หน้านี้ไม่เลื่อน stage · ดูรายละเอียดจะเปิด guided drawer เดิม · ปุ่มสร้าง Ticket เห็นเฉพาะ PM และเฉพาะการ์ดที่ใกล้ถึงหรือเลยกำหนด</p>}
 </DashCard>
 <ServicingPhaseChart rows={phaseRows} service={filter.service} periodA={periodA} periodB={periodB} compare={filter.compare} pending={pending} periodLabel={periodLabel}/>
 <ServicingGoLiveChart rows={servicingScope(report?.rows??[],filter)} service={filter.service} periodA={periodA} periodB={periodB} compare={filter.compare} pending={pending}/>
 {assignRow&&<CaretakerModal row={assignRow} demo={demo} onClose={()=>setAssignRow(null)} onOptimistic={patch=>setOverlay(o=>({...o,[assignRow.card_id]:{...o[assignRow.card_id],...patch}}))}/>}
 <ServicingCardDrawer key={drawer??'closed'} id={drawer} readOnly onClose={()=>setDrawer(null)}/>
 </section>;
}
function LanePill({lane:l,gmb}:{lane:ServicingLane;gmb:boolean}) {
 const text=l.state==='reserved'?'Specialist · สงวนไว้ (ยังไม่มี handover)':l.state==='none'?'—':l.state==='wait'?l.row2?'รอ ORM ตรวจรับ row-2':`รอประชุม ${shortThaiDate(l.wait_until??l.start_at??'2026-10-17')}`:l.state==='done'?l.lane==='Specialist'?`✓ Specialist ส่ง handover ครบ (วันที่ ${l.d})`:l.phase==='P2'&&l.lane!=='AE'?`✓ สร้างนัดแล้ว (วันที่ ${l.d})`:`✓ ${l.phase} · ${l.lane} · วันที่ ${l.d}`:`${l.phase} · ${gmb?'Marcom (GMB → Go Live)':l.lane} · วันที่ ${l.d} · ${statusText(l.phase,l.d??0)}`;
 return <span className={`sv-lane-pill sv-tone-${l.tone??'wait'} ${l.state==='reserved'?'sv-reserved-pill':''}`}>{text}</span>;
}
/** Opens the existing v1.1 AssignDialog per slot (same write + audit as Hotel Profile). Demo = in-session no-op. */
function CaretakerModal({ row, demo, onClose, onOptimistic }: { row: ServicingRow; demo: boolean; onClose: () => void; onOptimistic: (p: Partial<ServicingRow>) => void }) {
  const s = useServicing();
  const hr = useHrMembers();
  const card = s.cards.find((c) => c.id === row.card_id);
  const [slot, setSlot] = useState<AssignType | null>(null);
  const slots: CaretakerSlot[] = ["AE", "SPECIALIST", row.service_line === "ORM" ? "ORM" : "MARCOM"];
  const current: Record<CaretakerSlot, string | null> = { AE: row.ae_owner_id, SPECIALIST: row.specialist_id, ORM: row.orm_team, MARCOM: row.marcom_owner_id };
  const field: Record<CaretakerSlot, keyof ServicingRow> = { AE: "ae_owner_id", SPECIALIST: "specialist_id", ORM: "orm_team", MARCOM: "marcom_owner_id" };
  const fn = { AE: "AE", SPECIALIST: "ONBOARDING_SPECIALIST", ORM: "ORM_REVENUE", MARCOM: "MARCOM" } as const;
  const [demoPick, setDemoPick] = useState<Partial<Record<CaretakerSlot, string>>>({});
  return (
    <>
      <Dialog open={!slot} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>ระบุผู้ดูแล — {row.hotel_name} · {row.service_line === "ORM" ? "ORM" : "Marcom"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {slots.map((k) => (
              <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-24 text-muted-foreground">{SLOT_LABEL[k]}</span>
                {demo ? (
                  <select aria-label={SLOT_LABEL[k]} className="h-9 flex-1 rounded-md border bg-background px-2" value={demoPick[k] ?? current[k] ?? ""} onChange={(e) => setDemoPick((p) => ({ ...p, [k]: e.target.value }))}>
                    <option value="">— เลือก —</option>
                    {hr.members.filter((m) => m.active && m.function === fn[k]).map((m) => <option key={m.id} value={k === "ORM" ? m.orm_team ?? m.id : m.id}>{k === "ORM" ? `Team ${m.orm_team ?? "—"} · ${m.nickname}` : m.nickname}</option>)}
                  </select>
                ) : (
                  <>
                    <span className="flex-1">{current[k] ? hr.nick(current[k]) ?? current[k] : <span className="text-warning-foreground">— ยังไม่ระบุ</span>}</span>
                    <Button size="sm" variant="outline" disabled={!card} onClick={() => setSlot(k)}>แก้ไข</Button>
                  </>
                )}
              </div>
            ))}
            {!demo && !card && <p className="text-xs text-muted-foreground">ยังไม่พบการ์ดนี้ในเครื่องนี้ จึงบันทึกจากที่นี่ไม่ได้</p>}
            {demo && <p className="text-xs text-muted-foreground">DEMO · บันทึกเฉพาะหน้าจอนี้ ไม่เขียนข้อมูลจริง</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            <Button onClick={() => {
              if (demo) { onOptimistic(Object.fromEntries(Object.entries(demoPick).filter(([, v]) => v).map(([k, v]) => [field[k as CaretakerSlot], v]))); toast.success("DEMO · อัปเดตชั่วคราว"); }
              onClose();
            }}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {slot && card && <AssignDialog card={card} type={slot} onClose={() => {
        // Optimistic: reflect the existing v1.1 write until the debounced sync refreshes the cloud view.
        onOptimistic({ [field[slot]]: current[slot] ?? "(บันทึกแล้ว)" } as Partial<ServicingRow>);
        setSlot(null);
      }} />}
    </>
  );
}

