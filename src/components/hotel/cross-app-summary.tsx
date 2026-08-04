import { formatDate, statusMeta } from "@/lib/hotel-profile";
import {
  activeTermOf,
  avgMonthlyFee,
  contractRange,
  hotelScore,
  hotelStatus,
  useHotelStore,
} from "@/lib/hotel-store";
import { money } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Section } from "@/components/hotel-form";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

/** Read-only view of what the *other* department entered. */
export function CrossAppSummary({ source }: { source: "ac" | "ps" }) {
  const { selected: h } = useHotelStore();
  const sm = statusMeta[hotelStatus(h)];
  const { start, end } = contractRange(h);
  const { index, term } = activeTermOf(h);
  const { score, grade } = hotelScore(h);

  if (source === "ac") {
    return (
      <Section
        code="AC App"
        title="ข้อมูลจากทีม Accounting (อ่านอย่างเดียว)"
        subtitle={h.acSaved ? "บันทึกแล้วโดย AC App" : "ยังไม่ถูกบันทึกโดย AC App"}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Row label="รหัสโรงแรม" value={h.code} />
          <Row label="ชื่อโรงแรม" value={h.name} />
          <Row label="ประเภทผู้ทำสัญญา" value={h.contractorType} />
          <Row
            label="Status"
            value={
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", sm.className)}>
                {sm.label}
              </span>
            }
          />
          <Row label="Score การชำระเงิน" value={`${score} (เกรด ${grade})`} />
          <Row label="ค้างชำระ" value={`${h.overdueMonths} เดือน`} />
          <Row label="ผู้ติดต่อหลัก" value={h.mainContact.fullName} />
          <Row label="ค่าบริการเฉลี่ย / เดือน" value={money(avgMonthlyFee(h))} />
        </div>
      </Section>
    );
  }

  return (
    <Section
      code="PS App"
      title="ข้อมูลจากทีม Partner Success (อ่านอย่างเดียว)"
      subtitle={h.psSaved ? "บันทึกแล้วโดย PS App" : "ยังไม่ถูกบันทึกโดย PS App"}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Row label="Contract Start" value={formatDate(start)} />
        <Row label="Contract End" value={formatDate(end)} />
        <Row label="จำนวนสัญญา" value={`${h.terms.length} สัญญา`} />
        <Row
          label="สัญญาที่ active"
          value={index ? `สัญญาที่ ${index}` : "ไม่มีสัญญา active"}
        />
        <Row label="ระบบที่ใช้" value={h.system.system} />
        <Row label="H+ เป็นผู้ชำระเงิน" value={h.system.hplusPays ? "Yes" : "No"} />
        <Row
          label="Terminate"
          value={h.termination.active ? `${formatDate(h.termination.date)} · ${h.termination.reason}` : "—"}
        />
        <Row label="Terminate fee" value={h.termination.active ? money(Number(h.termination.fee) || 0) : "—"} />
      </div>

      {!!term?.services.length && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {term.services.map((s, i) => (
            <div key={s.id} className="rounded-lg border bg-surface/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                บริการ #{i + 1} · {s.category || "—"}
              </p>
              <p className="mt-1 truncate text-sm font-medium">{s.serviceType || "ยังไม่ระบุ"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {money((Number(s.monthlyFee) || 0) + (Number(s.marcomFee) || 0) + (Number(s.productionAmount) || 0))}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
