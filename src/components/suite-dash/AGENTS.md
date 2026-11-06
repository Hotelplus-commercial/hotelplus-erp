# Suite dashboards (Dashboards R1 Patch B, 2026-11-06)
- Overview ("/") + BD / ORM / Marcom / AC / HR(top) / AUTO dashboards are read only: no writes, no new storage key. Why: review mockups must never change business data.
- Real numbers come only through src/components/suite-dash/sources.tsx, which calls the source page's own hook / helper (useHeaderR2 + journeyScorecard, marcomChannelsAsOf, useMeetingFunnel, useServiceTicketRows, BD-AC views with the Office clock, useWelcomeBackSource, getSurveyFlags / useCoachingTasks, useDebtHeadline, billTiles, categoryRequests, HR members). Never recompute a rule here.
- Same cards are mounted, never forked: MeetingFunnel / FunnelCard (meeting-tab-r1), BdacCohortBars (bdac-tab), PaidGradeCard / DebtorCardR11, PartnerBillCostCard (partner-bills-page).
- Sample numbers live only in src/lib/suite-dashboards/*-dashboard-sample.ts and every sample tile / card shows `ข้อมูลตัวอย่าง` + `ที่มา (เมื่อเชื่อมแล้ว): …`; names only from the HR roster / existing DEMO members / SP9 sample.
- Period picker (เดือนนี้ / ไตรมาส / ปี / กำหนดเอง) changes period cards only; point-in-time numbers show `ณ วันนี้` (Header R2).
- DEMO = the shared DEMO switch (useSuiteDemo, same as AC App › บิล Partner). Overview shows only visibleApps(menu role); `ไปที่ {App} →` = landingOf(app, role).
- Old ERP summary is unmounted from "/" and kept at /overview-legacy (not in the menu).
- B.1: Overview `อัตราต่อสัญญา (ไตรมาส)` = useRenewalRateQuarter (renewal card's own items + quarterRenewalStats); dashboard ticket counts = vServiceTickets with PS cases (useTaskData), same rows as PS › ติดตามงานผู้ให้บริการ. /overview-legacy metrics are hotel-template samples, never moved.
- PR-O1 (closed 6 Nov 2026): AC Dashboard tile + Overview AC card `ใบแจ้งหนี้รอ Production Report` = usePrWaiting (drop items not พร้อมวางบิล after the cut-off; same items as the page). Open item: live PS header numbers on dashboards read without the PS report (DEMO equals the PS header).
