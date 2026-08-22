import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calculator, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockOrmOutput, useBd, type OrmPackage } from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/calculator/orm")({
  head: () => ({
    meta: [
      { title: "ORM Calculator — BD App | Meridia Hotel ERP" },
      { name: "description", content: "คำนวณแพ็กเกจ ORM จากจำนวนห้อง ฤดูกาล และสัดส่วน OTA แล้วออกใบเสนอราคา" },
      { property: "og:title", content: "ORM Calculator — BD App" },
      { property: "og:description", content: "คำนวณแพ็กเกจ ORM แล้วออกใบเสนอราคาเป็น PDF" },
    ],
  }),
  component: OrmCalculator,
});

const OTAS = ["Agoda", "Booking.com", "Trip.com", "Expedia", "Traveloka", "Gother"];
const PKG_KEYS = ["lite", "smart", "fixed", "performance"] as const;
const PKG_NAME: Record<(typeof PKG_KEYS)[number], string> = {
  lite: "Lite Service",
  smart: "Smart Service",
  fixed: "Fixed Service",
  performance: "Performance",
};

type Season = { months: number; adr: number };

function OrmCalculator() {
  const { createQuote } = useBd();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [seasons, setSeasons] = useState<Record<"high" | "shoulder" | "low", Season>>({
    high: { months: 3, adr: 1900 },
    shoulder: { months: 7, adr: 1500 },
    low: { months: 2, adr: 1300 },
  });
  const [hasOta, setHasOta] = useState<boolean | null>(null);
  const [otas, setOtas] = useState<string[]>([]);
  const [otaPct, setOtaPct] = useState("");
  const [output, setOutput] = useState<ReturnType<typeof mockOrmOutput> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const reset = () => {
    setHotel("");
    setRoomKey("");
    setOccupancy("");
    setHasOta(null);
    setOtas([]);
    setOtaPct("");
    setOutput(null);
    setSelected([]);
  };

  const calculate = () => {
    if (!hotel.trim() || !roomKey) {
      toast.error("กรุณากรอกชื่อโรงแรมและจำนวนห้อง");
      return;
    }
    // NOTE: mocked — จะสลับเป็น POST /api/orm-calculator/calculate ของ tool ที่ deploy แล้ว
    const out = mockOrmOutput(Number(roomKey));
    setOutput(out);
    setSelected([out.recommended_package]);
    toast.success("คำนวณเรียบร้อย (mock จาก ORM Calculator API)");
  };

  const exportPdf = () => {
    if (!output || selected.length === 0) {
      toast.error("เลือกอย่างน้อย 1 แพ็กเกจก่อน Export");
      return;
    }
    const id = createQuote({
      type: "ORM",
      hotel_name: hotel.trim(),
      calculator_input: {
        room_key: Number(roomKey),
        occupancy: Number(occupancy) || 0,
        seasons,
        ota_selected: otas,
        ota_percentage: Number(otaPct) || 0,
      },
      calculator_output: output,
    });
    toast.success(`สร้างใบเสนอราคา ${id} (status: Not sent)`);
    navigate({ to: "/bd/quotes" });
  };

  return (
    <div className="space-y-4">
      <Panel title="ข้อมูลพื้นฐาน" subtitle="Calculator เป็นจุดเริ่มต้น — ยังไม่ต้องมี Deal หรือ Customer">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ชื่อโรงแรม *">
            <Input value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="เช่น Sumator Resort" />
          </Field>
          <Field label="จำนวนห้อง (Room key) *">
            <Input type="number" value={roomKey} onChange={(e) => setRoomKey(e.target.value)} />
          </Field>
          <Field label="Occupancy %">
            <Input type="number" value={occupancy} onChange={(e) => setOccupancy(e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="ข้อมูลตามฤดูกาล" subtitle="จำนวนเดือน + ADR ของแต่ละช่วง">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["high", "High Season", "bg-warning/15"],
              ["shoulder", "Shoulder Season", "bg-destructive/10"],
              ["low", "Low Season", "bg-primary/10"],
            ] as const
          ).map(([key, label, bg]) => (
            <div key={key} className={cn("rounded-xl border p-3", bg)}>
              <p className="text-sm font-semibold">{label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="เดือน">
                  <Input
                    type="number"
                    value={seasons[key].months}
                    onChange={(e) =>
                      setSeasons((s) => ({ ...s, [key]: { ...s[key], months: Number(e.target.value) } }))
                    }
                  />
                </Field>
                <Field label="ADR">
                  <Input
                    type="number"
                    value={seasons[key].adr}
                    onChange={(e) => setSeasons((s) => ({ ...s, [key]: { ...s[key], adr: Number(e.target.value) } }))}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="ช่องทาง OTA" subtitle="โรงแรมมี OTA อยู่แล้วหรือไม่?">
        <div className="flex flex-wrap gap-2">
          {[true, false].map((v) => (
            <Button
              key={String(v)}
              variant={hasOta === v ? "default" : "outline"}
              size="sm"
              onClick={() => setHasOta(v)}
            >
              {v ? "มีแล้ว" : "ยังไม่มี"}
            </Button>
          ))}
        </div>
        {hasOta && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {OTAS.map((o) => {
                const on = otas.includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => setOtas((p) => (on ? p.filter((x) => x !== o) : [...p, o]))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      on ? "border-success bg-success/12 text-success" : "hover:bg-muted",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            <div className="max-w-xs">
              <Field label="สัดส่วนยอดขายผ่าน OTA (%)">
                <Input type="number" value={otaPct} onChange={(e) => setOtaPct(e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button className="gap-1.5" onClick={calculate}>
          <Calculator className="size-4" /> คำนวณผลลัพธ์
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={reset}>
          <RotateCcw className="size-4" /> รีเซ็ต
        </Button>
      </div>

      {output && (
        <>
          <div className="rounded-xl border border-success bg-success/8 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">แพ็กเกจที่แนะนำ</p>
            <p className="mt-1 font-display text-xl font-bold">
              {PKG_NAME[output.recommended_package]}{" "}
              <Chip tone="success">{output.recommended_level}</Chip>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ผลลัพธ์นี้มาจาก ORM Calculator ที่ deploy แล้ว (ตอนนี้เป็น mock response)
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {PKG_KEYS.map((k) => (
              <PackageCard
                key={k}
                name={PKG_NAME[k]}
                pkg={output.packages[k]}
                recommended={output.recommended_package === k}
              />
            ))}
          </div>

          <Panel
            title="Export PDF"
            subtitle="เลือกแพ็กเกจที่จะรวมในใบเสนอราคา — Export แล้วระบบจะสร้าง Quote สถานะ Not sent"
            className="border-destructive/40"
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={selected.length === PKG_KEYS.length}
                  onCheckedChange={(v) => setSelected(v ? [...PKG_KEYS] : [])}
                />
                เลือกทั้งหมด
              </label>
              {PKG_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(k)}
                    onCheckedChange={(v) =>
                      setSelected((p) => (v ? [...new Set([...p, k])] : p.filter((x) => x !== k)))
                    }
                  />
                  {PKG_NAME[k]}
                </label>
              ))}
            </div>
            <Button className="mt-4 gap-1.5" onClick={exportPdf}>
              <Download className="size-4" /> Export PDF & สร้างใบเสนอราคา
            </Button>
          </Panel>
        </>
      )}
    </div>
  );
}

function PackageCard({ name, pkg, recommended }: { name: string; pkg: OrmPackage; recommended: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", recommended && "border-warning bg-warning/10")}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{name}</p>
        {recommended && <Chip tone="warn">แนะนำ</Chip>}
      </div>
      <div className="mt-3 rounded-lg bg-surface/60 p-3">
        <p className="font-display text-lg font-bold">{pkg.base_price ? thb(pkg.base_price) : "ไม่มีค่าคงที่"}</p>
        <p className="text-xs text-muted-foreground">
          {pkg.commission != null ? `+ คอมมิชชั่น ${(pkg.commission * 100).toFixed(0)}%` : "ไม่มีคอมมิชชั่น"}
        </p>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {pkg.includes.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
