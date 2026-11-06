# RULES_ONBOARD — moved word for word from src/components/ps/AGENTS.md

## On-board / Off-board R1 (2026-11-06) — supersedes SV4 / SV5 wording, tiles ⚠ รอระบุผู้ดูแล, watch-list drill, ② dot chart, ③ A/B compare and the R4 queue columns IN THIS TAB ONLY
- Tab content = OnboardTab (src/components/ps/onboard-tab.tsx); ServicingTab mounts it; old cockpit kept unmounted as ServicingTabLegacy, R4 SetupQueueTable and card ⑤ PmPanel kept unmounted. Why: Workspace / BOT / later rounds may reuse them.
- `v_onb_*` are pure code helpers in src/lib/onboard-tab.ts (vOnbCards, vOnbOverall, vOnbPipeline, vOnbOwners, vOnbDays, vOnbSettingsAnalysis, dayLeft, doneStatus, totalLeft, cardDayLeft) on getSetupTiming()/statusFor(); never database views. Why: card timestamps are partly browser-local.
- One Day-left wording (dayLeft) for every per-contract status in this tab and in card ⑤ tooltip; statuses use the card's own setup_kpi_settings version, headers/zones/settings page use the latest.
- Settings › SLA On-board (/ps/settings/sla-onboard, sla-onboard-settings.tsx) is the only writer of setup_kpi_settings (PM via testing "สวมบท", same-day save replaces). Card ⑤ `⚙ SLA On-board` links there.
- Phase codes P1/P2/P3 only inside the queue section (data-testid sd-queue) and card ⑤; elsewhere phase words (ช่วง AE · ช่วงเตรียมระบบ · รอวันประชุม · ช่วงก่อน Go Live).
- DEMO: src/lib/onboard-tab-demo.ts (separate from the R4 card ⑤ set); HR demo members via demoHrOverlay() in memory only, never written to the HR roster.
- "สร้าง ticket ติดตาม" reuses createServicingStall unchanged (no category passed; the service-ticket view maps ORM/Marcom stalls to ตั้งค่าเริ่มต้น (On-board), PM-routed to อื่น ๆ).
- Open item OB-O1: Two SLA sources until OB-O1 is decided — servicing_sla_config (src/lib/servicing-time.ts, 5/7 · 5/7 · P3 3/7) still drives Workspace Servicing cards, servicingLanes/cardStatus and the BOT SERVICING_STALL check; this tab uses setup_kpi_settings. Do not switch without a prompt.
