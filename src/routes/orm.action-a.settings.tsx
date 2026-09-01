import { createFileRoute } from "@tanstack/react-router";
import { History, Lock, Upload } from "lucide-react";
import { toast } from "sonner";

import { OrmCard, TierPill } from "@/components/orm/orm-ui";
import { ormHotels, tierAudit, useOrmActionA, type Season, type Tier } from "@/lib/orm-action-a";
import { cn } from "@/lib/utils";

const roles = ["Group Revenue Manager", "ORM Specialist", "Hotel Owner"];
const uploadSlots = [
  { key: "meta", label: "Meta Search Export (CSV)", hint: "ราคา 6 โรงแรม × 5 ช่วงเวลา" },
  { key: "otb", label: "Booking Pace / OTB (XLSX)", hint: "ยอดจองสะสมรายเดือน" },
  { key: "content", label: "OTA Content Score (CSV)", hint: "Content / Review / Ranking ต่อ OTA" },
];

export const Route = createFileRoute("/orm/action-a/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่าโรงแรม — Hotel Plus ORM | Meridia" },
      {
        name: "description",
        content: "Hotel profile, tier governance with role-based lock, tier change audit log and monthly data upload slots.",
      },
      { property: "og:title", content: "ตั้งค่าโรงแรม — Hotel Plus ORM | Meridia" },
      { property: "og:description", content: "Tier governance, audit trail and data upload slots for the ORM loop." },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const { hotel, tier, setTier, season, setSeason, role, setRole } = useOrmActionA();
  const canEditTier = role === "Group Revenue Manager";
  const base = ormHotels.find((h) => h.id === hotel.id)!;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold">ตั้งค่าโรงแรม (Hotel Settings)</h1>
        <p className="text-sm text-muted-foreground">ข้อมูลพื้นฐาน · การกำหนด Tier · การอัปโหลดข้อมูลรายเดือน</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OrmCard title="โปรไฟล์โรงแรม" subtitle="ข้อมูลอ้างอิงของรอบวิเคราะห์">
          <dl className="divide-y text-sm">
            <Row label="ชื่อโรงแรม" value={hotel.name} />
            <Row label="รหัส" value={hotel.id.toUpperCase()} />
            <Row label="ADR ปัจจุบัน" value={`฿${base.adr.toLocaleString()}`} />
            <Row label="สถานะรอบปัจจุบัน" value={base.status} />
            <Row label="Loop ที่ผ่านมา" value={`${base.loop} รอบ`} />
          </dl>
        </OrmCard>

        <OrmCard title="Tier & Season" subtitle="Tier กำหนดสิ่งที่ลูกค้าเห็นในรายงาน">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Tier ปัจจุบัน</label>
                <TierPill tier={tier} />
              </div>
              <div className="group relative mt-2">
                <select
                  disabled={!canEditTier}
                  value={tier}
                  onChange={(e) => {
                    setTier(e.target.value as Tier);
                    toast.success(`เปลี่ยน Tier เป็น ${e.target.value} แล้ว (บันทึกลง Audit Log)`);
                  }}
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2 text-sm",
                    !canEditTier && "cursor-not-allowed opacity-60",
                  )}
                >
                  <option value="A">Tier A — เห็นทุกอย่าง เลือกกลยุทธ์เอง</option>
                  <option value="B">Tier B — เห็นผลเต็ม แต่ไม่เลือกกลยุทธ์</option>
                  <option value="C">Tier C — เห็นภาพรวมเชิงคุณภาพ</option>
                </select>
                {!canEditTier && (
                  <div className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2">
                    <Lock className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              {!canEditTier && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3" />
                  เฉพาะ Group Revenue Manager เท่านั้นที่แก้ Tier ได้
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">ฤดูกาล (Season)</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as Season)}
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="High">High Season</option>
                <option value="Shoulder">Shoulder</option>
                <option value="Low">Low Season</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">บทบาทผู้ใช้ (จำลอง)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </OrmCard>
      </div>

      <OrmCard title="ประวัติการเปลี่ยน Tier (Audit Log)" subtitle="ทุกการเปลี่ยนถูกบันทึกพร้อมผู้ทำรายการ">
        <ul className="flex flex-col gap-3">
          {tierAudit.map((a) => (
            <li key={a.at} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-orm/10">
                <History className="size-3.5 text-orm" />
              </div>
              <div>
                <p className="font-medium">
                  {a.from} → {a.to}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.at} · {a.by}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </OrmCard>

      <OrmCard title="อัปโหลดข้อมูลรอบเดือน" subtitle="ต้องครบทั้ง 3 ไฟล์ก่อนเริ่ม Loop ใหม่">
        <div className="grid gap-3 md:grid-cols-3">
          {uploadSlots.map((s) => (
            <div
              key={s.key}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors hover:border-orm hover:bg-orm/5"
            >
              <Upload className="size-5 text-orm" />
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
              <button
                onClick={() => toast.info("ตัวอย่างระบบ — ยังไม่รองรับการอัปโหลดจริง")}
                className="mt-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                เลือกไฟล์
              </button>
            </div>
          ))}
        </div>
      </OrmCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
