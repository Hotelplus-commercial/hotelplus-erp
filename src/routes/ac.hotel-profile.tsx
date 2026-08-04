import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { AcProfileForm } from "@/components/hotel/ac-profile-form";
import { CrossAppSummary } from "@/components/hotel/cross-app-summary";
import { HotelSwitcher } from "@/components/hotel/hotel-switcher";

const description =
  "AC App: สร้างและแก้ไข Hotel Profile ของแต่ละโรงแรม พร้อมผู้ติดต่อและสิทธิ์การเข้าถึง เมื่อบันทึกแล้ว PS App จึงจะกรอกสัญญาได้";

export const Route = createFileRoute("/ac/hotel-profile")({
  head: () => ({
    meta: [
      { title: "Hotel Profile — AC App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "Hotel Profile — AC App" },
      { property: "og:description", content: description },
    ],
  }),
  component: AcHotelProfile,
});

function AcHotelProfile() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="AC App · Master data"
        title="Hotel Profile"
        description={description}
      />
      <HotelSwitcher />
      <AcProfileForm />
      <CrossAppSummary source="ps" />
    </div>
  );
}
