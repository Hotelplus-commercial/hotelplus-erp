import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { ServicingDashboard } from "@/components/ps/servicing-dashboard";

const description =
  "On-boarding Process: สร้างการ์ดบริการ ทำงานตาม Pipeline และเปิด guided workflow สำหรับ ORM และ Marcom";

export const Route = createFileRoute("/ps/onboarding-process")({
  head: () => ({
    meta: [
      { title: "On-boarding Process — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "On-boarding Process — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingProcessPage,
});

function OnboardingProcessPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="PS App · On-boarding Process"
        title="On-boarding Process"
        description="สร้างการ์ด ดำเนินงาน และบันทึกทุกขั้นตอนบริการในระบบ"
      />
      <ServicingDashboard />
    </div>
  );
}