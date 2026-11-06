/* Patch A SP7 — Package Calculator, layout copied from the real portal (IMG-3 / IMG-4 / IMG-5). Cart in memory only. */
import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MARCOM_CATALOGUE, ORM_SAMPLE, ORM_SAMPLE_RESULTS, OTA_LIST, SURVEY, channelOrder, sameAsSample,
  type CartItem, type MarcomCard, type OrmInput,
} from "@/lib/bd/package-calculator";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("th-TH");
const box = "rounded-xl border bg-card p-5";

export function PackageCalculatorPage() {
  const [mode, setMode] = useState<"orm" | "marcom">("orm");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const add = (i: CartItem) => setCart((c) => (c.some((x) => x.id === i.id) ? c : [...c, i]));
  return (
    <div className="space-y-4" data-testid="package-calculator">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex rounded-lg bg-muted p-1">
          {(["orm", "marcom"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
              className={cn("rounded-md px-4 py-1 text-sm font-semibold", mode === m ? "bg-background shadow-sm" : "text-muted-foreground")}>{m === "orm" ? "ORM" : "Marcom"}</button>
          ))}
        </div>
        <Button className="bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setShowCart((s) => !s)}>
          <ShoppingCart className="h-4 w-4" />รายการสินค้าที่เลือก <span className="rounded-full bg-background px-1.5 text-xs" data-testid="cart-count">{cart.length}</span>
        </Button>
      </div>
      {showCart && <CartList cart={cart} onRemove={(id) => setCart((c) => c.filter((x) => x.id !== id))} />}
      {mode === "orm" ? <OrmCalc onAdd={add} onNext={() => setMode("marcom")} /> : <MarcomCalc cart={cart} onAdd={add} onBack={() => setMode("orm")} />}
    </div>
  );
}

function CartList({ cart, onRemove }: { cart: CartItem[]; onRemove: (id: string) => void }) {
  return (
    <div className={box} data-testid="cart-list">
      <div className="mb-2 font-semibold">รายการสินค้าที่เลือก</div>
      {cart.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีรายการ</p> : cart.map((i) => (
        <div key={i.id} className="flex items-center justify-between border-t py-1.5 text-sm">
          <span>{i.group} · {i.label}</span>
          <span className="flex items-center gap-3">{i.unit === "percent" ? `${i.price}%` : `฿${fmt(i.price)}${i.unit === "month" ? "/เดือน" : " (ครั้งเดียว)"}`}<button className="text-xs text-destructive" onClick={() => onRemove(i.id)}>ลบ</button></span>
        </div>
      ))}
    </div>
  );
}

/* ---------- ORM ---------- */
function OrmCalc({ onAdd, onNext }: { onAdd: (i: CartItem) => void; onNext: () => void }) {
  const [v, setV] = useState<OrmInput>(ORM_SAMPLE);
  const [done, setDone] = useState<OrmInput | null>(null);
  const set = (p: Partial<OrmInput>) => setV((x) => ({ ...x, ...p }));
  const season = (k: "high" | "shoulder" | "low", label: string, tone: string) => (
    <div className={cn("space-y-2 rounded-lg border p-4", tone)}>
      <div className="font-semibold">{label}</div>
      <label className="flex items-center gap-2 text-sm">จำนวนเดือน<Input type="number" value={v[k][0]} onChange={(e) => set({ [k]: [Number(e.target.value), v[k][1]] } as Partial<OrmInput>)} /></label>
      <label className="flex items-center gap-2 text-sm">ADR (บาท)<Input type="number" value={v[k][1]} onChange={(e) => set({ [k]: [v[k][0], Number(e.target.value)] } as Partial<OrmInput>)} /></label>
    </div>
  );
  const showSample = done && sameAsSample(done);
  return (
    <>
      <div className={cn(box, "space-y-4")}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">ข้อมูลพื้นฐาน</h2><Button size="sm" className="bg-warning text-warning-foreground hover:bg-warning/90">ตารางเปรียบเทียบบริการ</Button></div>
        <label className="block text-sm">ชื่อโรงแรม *<Input value={v.hotel} onChange={(e) => set({ hotel: e.target.value })} /></label>
        <label className="block text-sm">จำนวนห้องพัก *<Input type="number" value={v.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })} /></label>
        <label className="block text-sm">อัตราการเข้าพัก (%)<Input type="number" value={v.occupancy} onChange={(e) => set({ occupancy: Number(e.target.value) })} /></label>
        <h2 className="text-lg font-semibold">ข้อมูลตามฤดูกาล</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {season("high", "High Season", "border-destructive/40 bg-destructive/5")}
          {season("shoulder", "Shoulder Season", "border-warning/50 bg-warning/10")}
          {season("low", "Low Season", "border-info/40 bg-info/5")}
        </div>
        <div className="font-semibold">โรงแรมมี OTA อยู่แล้วหรือไม่?</div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={v.hasOta} onChange={() => set({ hasOta: true })} />มี</label>
          <label className="flex items-center gap-1"><input type="radio" checked={!v.hasOta} onChange={() => set({ hasOta: false })} />ไม่มี</label>
        </div>
        {v.hasOta && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">เลือก OTA ที่มีอยู่แล้ว (เลือกได้หลายช่องทาง)</div>
            <div className="flex flex-wrap gap-2">
              {OTA_LIST.map((o) => (
                <label key={o} className={cn("flex w-36 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm", v.otas.includes(o) && "border-warning")}>
                  <input type="checkbox" checked={v.otas.includes(o)} onChange={() => set({ otas: v.otas.includes(o) ? v.otas.filter((x) => x !== o) : [...v.otas, o] })} />{o}
                </label>
              ))}
            </div>
            <label className="block text-sm">สัดส่วนการขายผ่าน OTA (%) *<Input type="number" value={v.otaShare} onChange={(e) => set({ otaShare: Number(e.target.value) })} /></label>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setV(ORM_SAMPLE); setDone(null); }}>รีเซ็ต</Button>
          <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setDone(v)}>คำนวณผลลัพธ์</Button>
        </div>
        <details className="border-t border-dashed pt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">ดูวิธีคำนวณรายได้</summary>สูตรคำนวณรายได้และแพ็กเกจ ORM ยังไม่ได้รับจาก portal จริง — ตอนนี้แสดงผลตัวอย่างของข้อมูลตัวอย่างเท่านั้น</details>
      </div>
      {done && (
        <div className={cn(box, "space-y-3")} data-testid="orm-results">
          <h2 className="flex items-center gap-2 text-xl font-semibold">แพ็กเกจ Full Services <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">ระบบแนะนำ</span></h2>
          {!showSample && <p className="rounded-md bg-warning/15 px-3 py-2 text-sm">ยังคำนวณราคาสำหรับข้อมูลนี้ไม่ได้ — สูตร ORM จาก portal จริงยังไม่ได้รับ (แสดงผลได้เฉพาะข้อมูลตัวอย่าง)</p>}
          {ORM_SAMPLE_RESULTS.map((p) => (
            <div key={p.key} className="grid items-center gap-3 rounded-lg border p-4 md:grid-cols-[2fr_1.3fr_1.5fr_auto]">
              <div><div className="font-semibold">{p.name} {p.recommended && <span className="rounded-full bg-warning px-2 text-xs text-warning-foreground">แนะนำ</span>}</div><div className="text-xs text-muted-foreground">{p.desc}</div></div>
              <div className="rounded-md border bg-muted/30 px-3 py-2"><div className="text-xl font-bold">{showSample ? p.main : "—"}{p.key !== "perf" && <span className="text-xs font-normal"> บาท/เดือน</span>}</div><div className="text-xs font-semibold text-success">{showSample ? p.sub : ""}</div></div>
              <div className="text-xs"><div className="font-semibold text-muted-foreground">รวมบริการ</div>
                <div className="flex justify-between">• RevPlus+<span className="rounded-full bg-chart-4 px-1.5 text-[10px] text-background">One Time Setup</span></div>
                <div className="flex justify-between">• Register OTA<span className="rounded-full bg-chart-4 px-1.5 text-[10px] text-background">One Time Setup</span></div></div>
              <Button variant="ghost" size="sm" disabled={!showSample} onClick={() => onAdd({ id: `ORM-${p.key}`, label: p.name, price: p.key === "perf" ? 10 : p.key === "smart" ? 8320 : 16863, unit: p.key === "perf" ? "percent" : "month", group: "ORM" })}>+ เลือกแพ็กเกจ</Button>
              <details className="md:col-span-4 text-xs text-muted-foreground"><summary className="cursor-pointer">ดูวิธีคำนวณ {p.name.split(" (")[0]}</summary>สูตรจาก portal จริงยังไม่ได้รับ</details>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end"><Button variant="outline" onClick={onNext}>เลือกบริการ Marcom →</Button></div>
    </>
  );
}

/* ---------- Marcom ---------- */
function MarcomCalc({ cart, onAdd, onBack }: { cart: CartItem[]; onAdd: (i: CartItem) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [hotel, setHotel] = useState(ORM_SAMPLE.hotel);
  const [ans, setAns] = useState<number[][]>(SURVEY.map(() => []));
  const [open, setOpen] = useState<Record<string, boolean>>({ google: true, meta: true, tiktok: true, production: true });
  const [picked, setPicked] = useState<MarcomCard[]>([]);
  const allAnswered = ans.every((a) => a.length > 0) && !!hotel.trim();
  const toggle = (qi: number, oi: number) => setAns((A) => A.map((a, i) => {
    if (i !== qi) return a;
    if (SURVEY[qi]!.multi === 1) return [oi];
    return a.includes(oi) ? a.filter((x) => x !== oi) : a.length < SURVEY[qi]!.multi ? [...a, oi] : a;
  }));
  const order = channelOrder(ans[2] ?? []);
  const steps = ["Survey", "Select Services", "Summary"];
  return (
    <>
      <div className={cn(box, "flex justify-center gap-6 py-3")}>
        {steps.map((s, i) => (
          <button key={s} type="button" onClick={() => i < 2 && setStep(i)} className={cn("flex items-center gap-2 text-sm", i === step ? "font-semibold" : "text-muted-foreground")} data-testid={`step-${i}`}>
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs", i < step ? "bg-success text-success-foreground" : i === step ? "bg-warning text-warning-foreground" : "")}>{i < step ? "✓" : i + 1}</span>{s}
          </button>
        ))}
      </div>
      {step === 0 && (
        <div className={cn(box, "space-y-4")} data-testid="marcom-survey">
          <div className="text-center"><h2 className="text-lg font-semibold">สำรวจเป้าหมายและออกแบบแพ็กเกจที่เหมาะสม</h2>
            <p className="text-sm text-muted-foreground">ตอบ 5 ข้อ ใช้เวลาไม่ถึง 2 นาที เพื่อรับแพ็กเกจที่ตรงกับเป้าหมายสำหรับที่พักของท่านโดยเฉพาะ</p>
            <Button size="sm" className="mt-2 rounded-full bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => setStep(1)}>➤ ข้ามขั้นตอนนี้และเลือก Package ด้วยตนเอง</Button></div>
          <label className="block rounded-lg border bg-muted/30 p-4 text-sm font-semibold">ชื่อที่พัก / Hotel Name *<Input className="mt-1 font-normal" value={hotel} onChange={(e) => setHotel(e.target.value)} /></label>
          {SURVEY.map((q, qi) => (
            <div key={qi} className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-semibold"><span className="mr-2 rounded-full bg-warning px-2 text-xs">0{qi + 1}</span>{q.q}</div>
              {q.options.map((o, oi) => (
                <button key={oi} type="button" onClick={() => toggle(qi, oi)} aria-pressed={ans[qi]!.includes(oi)}
                  className={cn("block w-full rounded-md border px-3 py-2 text-left text-sm", ans[qi]!.includes(oi) ? "border-warning bg-warning/15" : "bg-muted/20")}>{qi + 1}.{oi + 1} {o}</button>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Button className="flex-1" disabled={!allAnswered} onClick={() => setStep(1)}>ดูแพ็กเกจที่แนะนำ →</Button>
            {!allAnswered && <span className="text-xs text-muted-foreground">ตอบครบทุกข้อ<br />จึงจะดูผลได้</span>}
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-3">
            <div><h2 className="text-xl font-semibold">เลือก Package & Add-on</h2><p className="text-xs text-muted-foreground">เลือก Package แต่ละช่องทางได้อิสระ · Add-on คิดราคาเพิ่มต่างหาก</p></div>
            {order.map((k) => MARCOM_CATALOGUE.find((c) => c.key === k)!).map((ch) => (
              <div key={ch.key} className="rounded-xl border bg-card" data-testid="marcom-accordion">
                <button type="button" className="flex w-full items-center justify-between p-4 font-semibold" onClick={() => setOpen((o) => ({ ...o, [ch.key]: !o[ch.key] }))}>
                  {ch.label}<span className="rounded bg-warning p-0.5 text-warning-foreground">{open[ch.key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                </button>
                {open[ch.key] && (
                  <div className="space-y-3 border-t p-4">
                    {ch.sections.map((s, si) => (
                      <div key={si}>
                        {s.label && <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">{s.label}</div>}
                        <div className="grid gap-2 md:grid-cols-2">
                          {s.cards.map((c) => {
                            const on = picked.some((p) => p.id === c.id);
                            return (
                              <button key={c.id} type="button" disabled={c.comingSoon} onClick={() => setPicked((p) => (on ? p.filter((x) => x.id !== c.id) : [...p, c]))}
                                className={cn("rounded-lg border p-3 text-left", on ? "border-foreground" : "bg-muted/20", c.comingSoon && "opacity-50")}>
                                <div className="text-[10px] font-semibold text-warning-foreground">{c.tier}</div>
                                <div className="text-sm font-semibold">{c.title}</div>
                                {c.note && <div className="text-[11px] text-muted-foreground">{c.note}</div>}
                                {c.bullets && <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">{c.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                                <div className="mt-1 text-base font-bold">{c.comingSoon ? "Coming Soon" : c.price == null ? "กรอกข้อมูลด้านล่าง" : <>{fmt(c.price)} <span className="text-xs font-normal">{c.unit === "month" ? "บาท/เดือน" : "บาท"}</span></>}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {ch.key === "production" && <p className="rounded-md bg-warning/10 px-3 py-1.5 text-[11px]">หมายเหตุ: ราคาไม่รวมค่าเดินทาง ที่พัก อาหาร สำหรับช่างภาพ · กรุณาเตรียมสถานที่–ห้องพักสำหรับพร้อมถ่ายทำ</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="h-fit space-y-3 rounded-xl border bg-card p-4" data-testid="marcom-summary-panel">
            <div className="border-b pb-2 font-semibold">สรุปรายการ</div>
            {picked.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">เริ่มเลือก Package<br />จากช่องทางข้างซ้าย</p> : picked.map((p) => (
              <div key={p.id} className="flex justify-between text-xs"><span>{p.title}</span><span>{p.price == null ? "—" : `฿${fmt(p.price)}`}</span></div>
            ))}
            <Button className="w-full" disabled={picked.length === 0} onClick={() => { picked.forEach((p) => onAdd({ id: p.id, label: p.title, price: p.price ?? 0, unit: p.unit, group: MARCOM_CATALOGUE.find((c) => c.sections.some((s) => s.cards.includes(p)))?.label ?? "Marcom" })); setPicked([]); setStep(2); }}>เพิ่มลงตะกร้า</Button>
            <Button variant="outline" className="w-full" onClick={() => setStep(0)}>↩ กลับหน้า Survey</Button>
          </div>
        </div>
      )}
      {step === 2 && <CartList cart={cart} onRemove={() => undefined} />}
      <div className="flex justify-end"><Button variant="outline" onClick={onBack}>← เลือกบริการ ORM</Button></div>
    </>
  );
}
