# PR-O1 · Production Report drop view and monthly cut-off

## Already done this turn (O-26.1 display fixes)
- PM to-do now reads "มีผล 1 Dec 26".
- "การเปลี่ยนระบบที่กำลังจะมีผล" shows "Chiang Rai Hill Lodge" (name looked up from the contract list, the same source real hotels use).
- Tests: 666 / 666 pass. Both fixes checked on screen in a fresh browser.

## §0 answers
1. **Report presence and revenue today:** AC types the revenue on the full page. The app finds a report by contract + product + year + month and stores it in the CRM data with the other reports. Commission = revenue × rate, saved as `commission_thb`. Saving a report triggers the daily billing run right away. On the 5th, billing looks for a report for the **current** month; if a commission line has no report, the invoice waits. Guarantee (DF2): after the 3rd of the following month, a missing report means the Guarantee is billed; a complete report bills max(commission, Guarantee). A PDF or hotel approval is never checked.
2. **Drop mode today:** a menu link becomes `?mode=drop`, which shows the "coming soon" placeholder. ORM, ORM_LEAD, GRM, MKT and MKT_LEAD are always sent there. AC, HOC and MD open the full page.
3. **Snapshot / Sync Up today:** both open their own placeholder pages (`/orm/snapshot-report`, `/marcom/sync-up-report`). No Report Automation page exists.
4. **"ใบแจ้งหนี้รอ Production Report":** on the AC Dashboard it is a fixed "—" with a tooltip. Suite Overview does not show it (its AC card has debt, A+B, Partner bills and overdue Partner bills).

## Plan

### §1–§2 Items, cut-off and statuses (PR1–PR7b)
- One pure engine in a new rules file: items are created on the 1st of the following month for every contract active in that month (using contractStateOn). Key = contract + month, so reloading never creates a duplicate.
- Cut-off = the 3rd at 23:59 (setting `pr_drop_due_day` = 3).
- Statuses are worked out from saved actions:
  - Sender actions: ส่งลูกค้าตรวจแล้ว · ลูกค้ายืนยัน / ลูกค้าแย้ง · ส่งไฟล์ให้ AC.
  - Results: auto-confirmed at the cut-off · พร้อมวางบิล · วางบิลแล้ว · ส่งกลับแก้ (reason required).
- Colours: grey · yellow "ตัดรอบวันนี้" · red "เลยตัดรอบ n วัน" · orange dispute · green ready.
- Sender = the contract's caretaker, from the existing Assign slots (ORM team / Marcom person). Leads can send for them.

### §3 Views by role (PR12–PR15)
On the same `/ac/production-report` page:
- **Drop view** replaces the placeholder:
  - ORM / MKT see the hotels they look after.
  - ORM_LEAD / GRM / MKT_LEAD see an overview with counters "ส่ง AC แล้ว x / y · เลยตัดรอบ n", team / status filters and a "เตือนผู้ดูแล" button. No money is shown.
- **AC / HOC / MD:** the full page keeps working and gains a drop-items panel showing statuses, files, revenue, "ส่งกลับแก้" and the invoice link.

### §4 Data entered (PR8–PR11)
- PDF only, 20 MB, several files allowed, every version kept. Files are stored on the device the same way as Partner documents.
- Revenue is required only for ORM commission contracts.
- No future months. Locked after พร้อมวางบิล until AC uses ส่งกลับแก้.

### §5 Billing and dashboards (PR18) — per your answers
- **Gate:** a ready item for service month M opens the commission invoice billed in M+1 (run on the 5th). This applies only to commission and commission + Guarantee lines. Flat monthly fees keep their current timing. Invoices already issued never change.
- **Revenue:** the drop item's revenue is the billing source.
  - AC's full page shows it read-only.
  - If AC had typed a different number, AC's old value stays in the history and AC sees the amber warning "รายได้ใน Production Report ต่างจากที่ AC กรอกไว้ ฿x → ฿y" until AC acknowledges it.
  - Months without a drop item keep AC's manual entry.
- **Guarantee:** commission + Guarantee contracts not ready after the cut-off bill the Guarantee (DF2 unchanged). Commission-only contracts wait.
- **Dashboard count:** the AC Dashboard tile becomes items not พร้อมวางบิล after the cut-off (the "—" and tooltip are removed). Suite Overview has no such number today; I'll add the same count to its AC card. Please say if you don't want that.

### §6 Bell items (PR16–PR17)
- Uses the existing bell, at most once per item per day: key = item + type + day.
- Triggers: 1st · 3rd · 4th (sender + lead) · AC sent back · dispute after the cut-off · auto-confirmed.

### §7 Report Automation (PR-Q1) — per your answer
- New placeholder page under PS App › ดูแลลูกค้ารายเดือน › Report Automation:
  - Title "Report Automation".
  - Purpose line "รวมรายงานรายเดือนที่ส่งให้ลูกค้า (ORM Snapshot · Marcom Sync Up) สำหรับ AE".
  - "เมนูนี้อยู่ระหว่างพัฒนา".
- Visible to AE · PM · OBS · HOC · MD, and reachable by ORM / MKT through the ↗ links.
- ORM "Snapshot Report ↗" and Marcom "Sync Up Report ↗" point there and keep DEMO. The old placeholder pages redirect there.
- Roadmap open item: "Report Automation page — needs a spec".

### §8 DEMO (add only; service month ก.ย. 69, today 28 ต.ค. 69)
- Eight sample items covering every case: customer confirmed · auto-confirmed (no reply) · open dispute · sent back by AC · not sent (red) · ready to bill · billed · the DF2 commission + Guarantee contract not sent.
- Held in memory only. Leads' counters are worked out from these items.

### §9 Tests
- All 9 acceptance items, plus the month mapping and the revenue-conflict warning.
- Forbidden-words check also covers the new pages.

### Report back
- AC Billing DEMO totals per contract before → after, and any contract whose bill moves to a different month.
- Fresh-browser check for ORM, ORM_LEAD, MKT_LEAD and AC.
- Rules files updated, PR-O1 closed, every rules file under 8,192 bytes.

## Technical details
- **Storage:** one new collection `meridia.production_report_drops.v1` (browser) → Cloud `ps:production_report_drops`, through the existing collection helper. PDF bytes go in the existing on-device file store (IndexedDB `meridia-partner-files`) and are never synced. No database change.
- **Pure logic:** `src/lib/pr-drop.ts` (items, status, cut-off, bell keys, overview counters, money-free lead rows).
- **Store adapter:** `src/lib/pr-drop-store.ts`.
- **Billing:** `src/lib/ac-v2-engine.ts` report lookup gets one extra source. Drop items that are ready, for month M−1, give `commission_thb` = revenue × rate; otherwise the current CRM report lookup is used. Guarantee is still decided only by `ac-guarantee.ts`.
- **Caretaker:** export the existing Assign-slot reader from coaching-store (no copy).
- **Rules to update:** AC AGENTS (AX/PR rules), suite-dash AGENTS (tile rule), RULES_TAB_R5_Q58 (fix the stale "Guarantee maximum not implemented" line), and sidebar rules for Report Automation.
