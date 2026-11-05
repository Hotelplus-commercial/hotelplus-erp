# Workspace rules

## Service tickets — receiver side (Receiver v1.0, ST46–ST60)
- §1 Switch: `service_sla: true` on the ORM · MARCOM · AC · BD rows of `WORKSPACES` (workspace-registry.ts). False elsewhere → 🎫 lane unchanged (PM · HR · AUTO · Office · AE My Day).
- §2 List: `ServiceReceiverLane` (service-receiver.tsx) reads `vServiceTickets()` only (L0 + PS cases via `ticketApi.list`, ticket_sla, ticket_followups). Words: New · กำลังดำเนินการ · รอลูกค้า · รอ 3rd Party · Solve · ยกเลิก. Pure helpers in src/lib/service-receiver.ts (laneRows / visibleRows / dueCell / followBadge / acceptChips / bellTarget). Members see the queue (New) + own; heads (GRM · Marcom Lead · AC Head (ทดสอบ) · BDM (ทดสอบ)) see all. FYI / watcher types stay in the old table below ("👁 แจ้งเพื่อทราบ"). BD keeps its old L0 table in full (L0 / L1 / R3.x acceptance), so BD service tickets also appear there.
- §3 Accept: modal → `acceptTicket()`; date chips +3/+5/+7/+10 from created date, picker limited to [today, created + 10]; heads may accept on behalf; write-once.
- §4 Panel: status actions → `changeTicketStatus()` (รอ 3rd Party needs รอใคร; อื่น ๆ needs text). PS cases: accept / due date / category / follow-ups only; status via "เปลี่ยนสถานะที่หน้าจอ case เดิม ↗" (/ps?tab=task). No Follow up button and no due-date edit on the receiver side.
- §5 Categories: gear "⚙️ หมวด ticket" for the head only; `checkCategoryOverlap` live → `addCategory` or locked → `requestCategory` (OGM). Head hides own-added only; system categories only OGM; no delete.
- §6 OGM: `OgmCategoryGroup` on the AUTO Workspace → `decideCategoryRequest` (reject needs a reason).
- §7 Shut-off / re-open (X4): the same SYSTEM_SHUTOFF / SYSTEM_REACTIVATE tickets (no copy); row/panel show type, contract, Partner system, AE and the twin PS ticket status (read only).
- "สมาชิกที่ดู (DEMO)" value is shared per Workspace via src/lib/ws-viewer.ts (Coaching picker on ORM / Marcom; lane picker on AC / BD). Simulation only, never security.
- Open items: Can PS cases be routed to BD? (file 1 routing currently ORM / MARCOM / AC). Receiver progress notes need a write path (file 1 has none) — note box hidden. Unhide category and OGM rename-before-approve have no file 1 service — hidden. Live mode has no named heads except BDM via the role switcher.
