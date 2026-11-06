# RULES_SERVICE_TICKET_TAB — moved word for word from src/components/ps/AGENTS.md

## Tab ติดตามงานผู้ให้บริการ R1 (2026-11-05) — supersedes the old KPI strip, ค้างจากระบบ, ticket ทั้งหมด cards, worklist and CaseDrawer on this tab (kept in task-tab.tsx behind LEGACY_TASK_TAB, unmounted)
- Rows come only from vServiceTickets() (L0 + PS cases + ticket_sla + ticket_followups); the §2 views are pure helpers in src/lib/service-ticket-tab.ts (vStabOpen / vStabPeriod / vStabMeetings + card selectors). No DB view. Why: browser-stored tickets are invisible to SQL views.
- Scope: target ORM · Marcom · AC · BD only; no AE / PM work, no GRADE_RISK / FYI, no Coaching, no PI Form, no renewal; department view only (no per-person ranking). CANCELLED never counted; medians only.
- Department filter (sticky) drives ① ② ③ ④ ⑤ ⑥; ① table always 4 rows (others dimmed); row click toggles.
- ⑤ urgency: meeting ≤ 3 days OR any open ticket of the hotel overdue OR Contract Health red → เร่งด่วน, else ต้องเคลียร์. Meetings via getMeetings() (status Confirmed, next 7 days) + tab DEMO additions; caretaker via meeting-tab-r1 caretakerOf(); health = Contract Health buildRows (card ⑦ inputs) in DEMO; live health shows "—" until a per-contract health source exists outside PS Dashboard projections.
- ⑥ search: space-separated tokens, all must match: plain word · ผู้รับ:text · เปิดโดย:text · อายุ>n / >= / < / <= / =.
- Drawer is view only + Follow up (sendFollowUp()), only AE / PM (testing "ทำรายการในนาม"); PS case status lives in the database and is never changed here; Follow-ups on PS cases go to ticket_followups and show in the drawer timeline.
- "+ สร้าง ticket": required หมวด for service departments = active categories of the chosen department (getCategories, never hidden) + "อื่น ๆ"; PS case category_id is stored in ticket_sla (no DB column); no due-date field.
- Chart ceiling label uses "เกณฑ์ 10 วัน" (the word เพดาน is on the forbidden list).

## UAT Polish R2 Patch A (2026-11-06)
- SP13: median วัน Solve shows as a grey summary box (value bold, larger); numbers unchanged.
- SP16: department table count columns sort มาก → น้อย / น้อย → มาก (one active sort; sortDepts()).
- SP16b: งานค้างของสัญญา (PendingWorkPanel) unmounted from this tab (SHOW_TASK_PENDING_WORK = false, code kept); card ⑤ ก่อนประชุมประจำเดือน stays.
- SP14: create ticket แนบไฟล์ = Partner upload rule (on-device store, 20 MB, Partner type list, Thai error per file, link fallback); PS cases keep refs on ticket_sla.attachments; opened from the case drawer. Existing L0 limit (5 files × 5 MB) unchanged on other paths.
- SP15: before บันทึก ticket, open tickets of same hotel + department (same category first) → dialog: Follow up ticket นี้แทน (sendFollowUp, no new ticket) · ยืนยันสร้าง ticket ใหม่ (audit ticket_sla.duplicate_ack) · ยกเลิก. Never blocks. Helpers: src/lib/ticket-create-extras.ts.
