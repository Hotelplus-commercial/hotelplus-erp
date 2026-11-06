/* On-board R1 §13 — PS App › ตั้งค่า › SLA On-board (setup_kpi_settings; PM-only save via the testing "สวมบท" switch). */
import { createFileRoute, Link } from "@tanstack/react-router";
import { SlaOnboardSettings } from "@/components/ps/sla-onboard-settings";

const description = "ตั้งกำหนดเวลาแต่ละเฟสของ On-board จนถึง Go Live · เฉพาะ PM แก้ได้ · มีผลกับการ์ดที่สร้างตั้งแต่วันที่บันทึก";
export const Route = createFileRoute("/ps/settings_/sla-onboard")({
  head: () => ({
    meta: [
      { title: "SLA On-board — ตั้งค่า PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "SLA On-board — ตั้งค่า PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="flex flex-col gap-4">
      <nav aria-label="หมวดตั้งค่า" className="flex gap-1 rounded-xl border bg-card p-1">
        <Link to="/ps/settings" className="rounded-lg px-3 py-1.5 text-sm font-medium">Template</Link>
        <span aria-current="page" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">SLA On-board</span>
      </nav>
      <SlaOnboardSettings />
    </div>
  ),
});
