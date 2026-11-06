/* Patch A SP6 — ADR Calculator, layout copied from the real portal (IMG-2). */
import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { overallAdr, typeAdr, type RoomType } from "@/lib/bd/adr";

const blank = (): RoomType => ({ name: "", rooms: 0, weekday: 0, weekend: 0 });
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function AdrCalculatorPage() {
  const [types, setTypes] = useState<RoomType[]>([blank()]);
  const [result, setResult] = useState<RoomType[] | null>(null);
  const set = (i: number, patch: Partial<RoomType>) => setTypes((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="space-y-4" data-testid="adr-calculator">
      <div className="rounded-xl border bg-card p-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold"><DollarSign className="h-5 w-5 text-success" />ADR Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">คำนวณ Average Daily Rate (ADR) ตามประเภทห้องพักและอัตราราคาวันธรรมดา / วันสุดสัปดาห์</p>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ประเภทห้องพัก</h2>
          <Button className="bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setTypes((t) => [...t, blank()])}>+ เพิ่มประเภทห้อง</Button>
        </div>
        {types.map((t, i) => (
          <div key={i} className="rounded-lg border border-warning/60 p-4" data-testid="adr-type">
            <div className="mb-2 text-sm font-semibold">ประเภทห้องที่ {i + 1}</div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">ชื่อประเภทห้อง<Input placeholder="เช่น Deluxe, Superior" value={t.name} onChange={(e) => set(i, { name: e.target.value })} /></label>
              <label className="text-sm">จำนวนห้อง<Input type="number" value={t.rooms} onChange={(e) => set(i, { rooms: Number(e.target.value) })} /></label>
              <label className="text-sm">ราคาวันธรรมดา (บาท)<Input type="number" value={t.weekday} onChange={(e) => set(i, { weekday: Number(e.target.value) })} /></label>
              <label className="text-sm">ราคาวันสุดสัปดาห์ (บาท)<Input type="number" value={t.weekend} onChange={(e) => set(i, { weekend: Number(e.target.value) })} /></label>
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => setResult(types)}>คำนวณ ADR</Button>
          <Button variant="outline" onClick={() => { setTypes([blank()]); setResult(null); }}>รีเซ็ต</Button>
        </div>
        {result && (
          <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm" data-testid="adr-result">
            {result.map((t, i) => <div key={i} className="flex justify-between"><span>{t.name || `ประเภทห้องที่ ${i + 1}`} · {t.rooms} ห้อง</span><span className="font-semibold">ADR ฿{baht(typeAdr(t))}</span></div>)}
            <div className="flex justify-between border-t pt-2 text-base"><span>ADR เฉลี่ยทั้งโรงแรม</span><span className="font-bold" data-testid="adr-overall">฿{baht(overallAdr(result))}</span></div>
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">ดูวิธีคำนวณ</summary>ADR ต่อประเภท = ราคาวันธรรมดา × 71.51% + ราคาวันสุดสัปดาห์ × 28.49% · ADR เฉลี่ย = ถ่วงน้ำหนักด้วยจำนวนห้อง</details>
          </div>
        )}
      </div>
      <div className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="md:col-span-2 text-lg font-semibold">คู่มือการใช้งาน</div>
        <div className="text-sm"><div className="mb-1 font-semibold">ขั้นตอนการใช้งาน</div><ol className="list-decimal space-y-0.5 pl-5">
          <li>กรอกชื่อประเภทห้องและจำนวนห้อง</li><li>ระบุราคาวันธรรมดาและวันสุดสัปดาห์สำหรับแต่ละประเภทห้อง</li><li>กดปุ่ม "คำนวณ ADR"</li><li>ดูผล ADR เฉลี่ยในส่วนผลการคำนวณ</li></ol></div>
        <div className="text-sm"><div className="mb-1 font-semibold">สัดส่วนวันธรรมดา / วันสุดสัปดาห์</div><ul className="list-disc space-y-0.5 pl-5">
          <li>วันธรรมดา (จันทร์–ศุกร์): <b>71.51%</b> ของวันทั้งปี</li><li>วันสุดสัปดาห์ (เสาร์–อาทิตย์): <b>28.49%</b> ของวันทั้งปี</li></ul></div>
      </div>
    </div>
  );
}
