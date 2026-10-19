/* R1 §9 entry 8 — PS App settings. First (and only) section: Template = the existing Templates page, same permissions. */
import { createFileRoute } from "@tanstack/react-router";
import { TemplatesDashboard } from "./ps.templates.index";

const description = "ตั้งค่า PS App: จัดการ Template ใบเสนอราคาและสัญญา (PM + System Admin แก้ไขได้ · คนอื่นอ่านอย่างเดียว)";
export const Route = createFileRoute("/ps/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่า — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "ตั้งค่า — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = [{ key: "template", label: "Template" }] as const;

function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="หมวดตั้งค่า" className="flex gap-1 rounded-xl border bg-card p-1">
        {SECTIONS.map((s) => (
          <span key={s.key} aria-current="page" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">{s.label}</span>
        ))}
      </nav>
      <TemplatesDashboard />
    </div>
  );
}
