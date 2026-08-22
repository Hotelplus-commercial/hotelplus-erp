import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBd, type LineItem } from "@/lib/bd-store";
import { thb } from "@/lib/crm-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/calculator/marcom")({
  head: () => ({
    meta: [
      { title: "Marcom Calculator — BD App | Meridia Hotel ERP" },
      { name: "description", content: "เลือกแพ็กเกจ Google / Meta / TikTok / Production แล้วสรุปค่าบริการเดือนแรก" },
      { property: "og:title", content: "Marcom Calculator — BD App" },
      { property: "og:description", content: "เลือกแพ็กเกจ Marcom แล้วออกใบเสนอราคาเป็น PDF" },
    ],
  }),
  component: MarcomCalculator,
});

type Catalog = { category: LineItem["category"]; title: string; groups: { tag: string; items: Omit<LineItem, "category">[] }[] };

const CATALOG: Catalog[] = [
  {
    category: "google",
    title: "Google",
    groups: [
      {
        tag: "One-Time Setup",
        items: [{ package_name: "Google My Business Setup", billing: "one_time", amount: 4500, is_addon: false }],
      },
      {
        tag: "Package",
        items: [
          { package_name: "Google Ads Lite", billing: "monthly", amount: 8000, is_addon: false },
          { package_name: "Google Ads Full + Ads Budget", billing: "monthly", amount: 18000, is_addon: false },
        ],
      },
    ],
  },
  {
    category: "meta",
    title: "Meta",
    groups: [
      { tag: "One-Time Setup", items: [{ package_name: "Social Plus", billing: "one_time", amount: 3500, is_addon: false }] },
      {
        tag: "Package",
        items: [
          { package_name: "Meta 6 Content (Lite)", billing: "monthly", amount: 9000, is_addon: false },
          {
            package_name: "Meta 10 Content + KOL Basic 1 + Ads Budget",
            billing: "monthly",
            amount: 15000,
            is_addon: false,
          },
        ],
      },
      { tag: "Add-on", items: [{ package_name: "Extra Content 4 ชิ้น", billing: "monthly", amount: 3500, is_addon: true }] },
    ],
  },
  {
    category: "tiktok",
    title: "TikTok",
    groups: [
      { tag: "One-Time Setup", items: [{ package_name: "TikTok Account Setup", billing: "one_time", amount: 2500, is_addon: false }] },
      {
        tag: "Package",
        items: [
          { package_name: "KOL Basic 1 (1 Slideshow + 1 VDO)", billing: "monthly", amount: 4000, is_addon: false },
          { package_name: "TikTok Full + Ads Budget", billing: "monthly", amount: 12000, is_addon: false },
        ],
      },
    ],
  },
  {
    category: "production",
    title: "Production",
    groups: [
      {
        tag: "One-Time",
        items: [
          { package_name: "Photoshoot Half Day", billing: "one_time", amount: 8000, is_addon: false },
          { package_name: "Photoshoot Full Day", billing: "one_time", amount: 14000, is_addon: false },
          { package_name: "Photoshoot Premium + VDO", billing: "one_time", amount: 25000, is_addon: false },
          { package_name: "Drone Coverage", billing: "one_time", amount: 6000, is_addon: false },
        ],
      },
    ],
  },
];

const WITH_ADS = /Ads Budget/i;

function MarcomCalculator() {
  const { createQuote } = useBd();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [hotel, setHotel] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [goal, setGoal] = useState("");
  const [picked, setPicked] = useState<LineItem[]>([]);

  const toggle = (item: LineItem) =>
    setPicked((p) =>
      p.some((x) => x.package_name === item.package_name) ? p.filter((x) => x.package_name !== item.package_name) : [...p, item],
    );

  const totals = useMemo(() => {
    const monthly = picked.filter((i) => i.billing === "monthly").reduce((s, i) => s + i.amount, 0);
    const onetime = picked.filter((i) => i.billing === "one_time").reduce((s, i) => s + i.amount, 0);
    return { monthly, onetime, first: monthly + onetime };
  }, [picked]);

  const grouped = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    picked.forEach((i) => map.set(i.category, [...(map.get(i.category) ?? []), i]));
    return [...map.entries()];
  }, [picked]);

  const exportPdf = () => {
    if (!hotel.trim()) {
      toast.error("กรุณากรอกชื่อโรงแรม");
      return;
    }
    if (picked.length === 0) {
      toast.error("ยังไม่ได้เลือกบริการ");
      return;
    }
    const id = createQuote({
      type: "MARCOM",
      hotel_name: hotel.trim(),
      calculator_input: {
        room_key: Number(roomKey) || 0,
        selected_services: Object.fromEntries(grouped.map(([c, items]) => [c, items.map((i) => i.package_name)])),
      },
      calculator_output: {
        selected_items: picked,
        monthly_total: totals.monthly,
        onetime_total: totals.onetime,
        first_month_total: totals.first,
      },
    });
    toast.success(`สร้างใบเสนอราคา ${id} (status: Not sent)`);
    navigate({ to: "/bd/quotes" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["Survey", "Select Services", "Summary"].map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i + 1)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              step === i + 1 ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 1 && (
        <Panel title="Step 1 · Survey" subtitle="ข้อมูลเบื้องต้นของโรงแรม">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ชื่อโรงแรม *</Label>
              <Input value={hotel} onChange={(e) => setHotel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">จำนวนห้อง</Label>
              <Input type="number" value={roomKey} onChange={(e) => setRoomKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">เป้าหมายหลัก</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="เช่น เพิ่ม direct booking" />
            </div>
          </div>
          <Button className="mt-4 gap-1.5" onClick={() => setStep(2)}>
            ถัดไป <ArrowRight className="size-4" />
          </Button>
        </Panel>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            {CATALOG.map((sec) => (
              <Panel key={sec.category} title={sec.title}>
                <div className="space-y-4">
                  {sec.groups.map((g) => (
                    <div key={g.tag}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {g.tag}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {g.items.map((it) => {
                          const item: LineItem = { ...it, category: sec.category };
                          const on = picked.some((x) => x.package_name === it.package_name);
                          return (
                            <button
                              key={it.package_name}
                              onClick={() => toggle(item)}
                              className={cn(
                                "rounded-xl border p-3 text-left transition",
                                on ? "border-warning bg-warning/10" : "hover:bg-muted/60",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{it.package_name}</p>
                                <Chip tone={it.billing === "monthly" ? "info" : "muted"}>
                                  {it.billing === "monthly" ? "รายเดือน" : "One-time"}
                                </Chip>
                              </div>
                              <p className="mt-1 font-display font-semibold">{thb(it.amount)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <Panel title="สรุปแพ็กเกจ" subtitle="ค่าบริการที่เลือกไว้">
              {picked.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่ได้เลือกบริการ</p>}
              <div className="space-y-3">
                {grouped.map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">{cat}</p>
                    {items.map((i) => (
                      <div key={i.package_name} className="flex justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate">{i.package_name}</span>
                        <span className="tabular-nums">{thb(i.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-warning/15 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">สรุปค่าบริการเดือนแรก</p>
                <div className="mt-1 flex justify-between text-xs">
                  <span>รายเดือน</span>
                  <span className="tabular-nums">{thb(totals.monthly)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>One-time</span>
                  <span className="tabular-nums">{thb(totals.onetime)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t pt-1 font-display font-bold">
                  <span>รวม</span>
                  <span>{thb(totals.first)}</span>
                </div>
              </div>
              <div className="mt-2 rounded-xl bg-primary/10 p-3 text-xs">
                ค่าบริการรายเดือนถัดไป <span className="font-semibold">{thb(totals.monthly)}</span>
              </div>
              {picked.some((i) => WITH_ADS.test(i.package_name)) ? (
                <p className="mt-2 text-xs text-success">✓ มีแพ็กเกจที่รวม Ads Budget แล้ว</p>
              ) : (
                picked.length > 0 && (
                  <p className="mt-2 text-xs text-warning-foreground">⚠ ยังไม่มีบริการที่รวม Ads Budget</p>
                )
              )}
              <Button className="mt-4 w-full" onClick={() => setStep(3)} disabled={picked.length === 0}>
                สรุป Package
              </Button>
            </Panel>
          </div>
        </div>
      )}

      {step === 3 && (
        <Panel title="Step 3 · Summary" subtitle="ตรวจสอบก่อน Export PDF">
          <div className="space-y-2">
            {picked.map((i) => (
              <div key={i.package_name} className="flex justify-between gap-3 border-b pb-1 text-sm last:border-0">
                <span>
                  <span className="text-muted-foreground">[{i.category}]</span> {i.package_name}
                </span>
                <span className="tabular-nums">
                  {thb(i.amount)} · {i.billing === "monthly" ? "รายเดือน" : "One-time"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อโรงแรม *</Label>
            <Input value={hotel} onChange={(e) => setHotel(e.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setStep(2)}>
              <ArrowLeft className="size-4" /> ย้อนกลับ
            </Button>
            <Button className="gap-1.5" onClick={exportPdf}>
              <Download className="size-4" /> Export PDF & สร้างใบเสนอราคา
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
