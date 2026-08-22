import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Info, Link2, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel, fmtDate } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  normalizeHotel,
  packageLabel,
  statusLabel,
  statusTone,
  useBd,
  type BdQuote,
} from "@/lib/bd-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/register-deal")({
  head: () => ({
    meta: [
      { title: "Register Deal — BD App | Meridia Hotel ERP" },
      { name: "description", content: "ลงทะเบียนดีล เชื่อม Pipedrive Deal ID และผูกใบเสนอราคาหลายฉบับของโรงแรมเดียวกัน" },
      { property: "og:title", content: "Register Deal — BD App" },
      { property: "og:description", content: "ลงทะเบียนดีลและผูกใบเสนอราคา ORM / Marcom พร้อมดู SKU ในแต่ละใบ" },
    ],
  }),
  component: RegisterDeal,
});

function RegisterDeal() {
  const { quotes, registerDeal } = useBd();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState("");
  const [openHotel, setOpenHotel] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pipedriveId, setPipedriveId] = useState("");
  const [pipedriveOk, setPipedriveOk] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);

  /* DISTINCT hotel_name จาก quotes + จำนวนใบ / room key ล่าสุด */
  const hotelOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number; rooms: number; latest: number }>();
    quotes.forEach((q) => {
      const key = normalizeHotel(q.hotel_name);
      const ts = new Date(q.created_at).getTime();
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { name: q.hotel_name, count: 1, rooms: q.calculator_input.room_key ?? 0, latest: ts });
        return;
      }
      prev.count += 1;
      if (ts > prev.latest) {
        prev.latest = ts;
        prev.name = q.hotel_name;
        prev.rooms = q.calculator_input.room_key ?? prev.rooms;
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [quotes]);

  const selectedHotel = hotelOptions.find((h) => normalizeHotel(h.name) === normalizeHotel(hotel));
  const roomKey = selectedHotel?.rooms ?? 0;

  /* quotes ของโรงแรมที่เลือกเท่านั้น (hotel-scoped) */
  const hotelQuotes = useMemo(
    () =>
      hotel
        ? quotes
            .filter((q) => normalizeHotel(q.hotel_name) === normalizeHotel(hotel))
            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        : [],
    [quotes, hotel],
  );

  const linkedQuotes = hotelQuotes.filter((q) => linked.includes(q.quote_id));
  const availableQuotes = hotelQuotes.filter((q) => !linked.includes(q.quote_id));

  const save = () => {
    if (!hotel.trim() || !pipedriveId.trim()) {
      toast.error("เลือกโรงแรมและกรอก Pipedrive Deal ID ก่อน");
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast.error("กรอกชื่อและอีเมลผู้ติดต่อ");
      return;
    }
    if (linked.length === 0) {
      toast.error("ผูกใบเสนอราคาอย่างน้อย 1 ฉบับ");
      return;
    }
    const id = registerDeal({
      hotel_name: selectedHotel?.name ?? hotel.trim(),
      room_key: roomKey,
      pipedrive_deal_id: pipedriveId.trim(),
      contact_person: { name, email },
      linked_quote_ids: linked,
    });
    toast.success(`สร้างดีล ${id} และอัปเดตใบเสนอราคา ${linked.length} ฉบับแล้ว`);
    navigate({ to: "/bd/quotes" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Quote เกิดก่อน Deal — ที่นี่คือขั้นตอนผูกดีลกับใบเสนอราคาที่มีอยู่ของโรงแรมนั้น
        </p>
        <Button className="gap-1.5" onClick={save}>
          <Save className="size-4" /> บันทึกดีล
        </Button>
      </div>

      <Panel title="Hotel Information" subtitle="เลือกจากรายชื่อโรงแรมที่เคยออกใบเสนอราคา — กันชื่อซ้ำแบบสะกดต่าง">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อโรงแรม *</Label>
            <Popover open={openHotel} onOpenChange={setOpenHotel}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className={cn("truncate", !hotel && "text-muted-foreground")}>
                    {selectedHotel?.name ?? hotel ?? "เลือกโรงแรม…"}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="ค้นหาโรงแรม…" />
                  <CommandList>
                    <CommandEmpty>ไม่พบโรงแรมในระบบใบเสนอราคา</CommandEmpty>
                    <CommandGroup>
                      {hotelOptions.map((h) => (
                        <CommandItem
                          key={h.name}
                          value={h.name}
                          onSelect={() => {
                            setHotel(h.name);
                            setLinked([]);
                            setOpenHotel(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              normalizeHotel(h.name) === normalizeHotel(hotel) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex-1 truncate">{h.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {h.count} quotes · {h.rooms} rooms
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Room key</Label>
              {hotel && <Chip tone="success">✓ Auto-filled</Chip>}
            </div>
            <Input readOnly value={hotel ? roomKey : ""} className="bg-surface/70" placeholder="—" />
            <p className="text-[11px] text-muted-foreground">ดึงจาก quote ล่าสุดของโรงแรม</p>
          </div>
        </div>
      </Panel>

      <Panel title="Contact Person">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อ-สกุล *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">อีเมล *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
      </Panel>

      <Panel title="Pipedrive Link" subtitle="ตรวจสอบ Deal ID (จำลอง — ของจริงจะเรียก Pipedrive API)">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pipedrive Deal ID *</Label>
            <Input
              value={pipedriveId}
              onChange={(e) => {
                setPipedriveId(e.target.value);
                setPipedriveOk(false);
              }}
              onBlur={() => setPipedriveOk(pipedriveId.trim().length > 0)}
              className="w-48"
            />
          </div>
          {pipedriveOk && (
            <p className="flex items-center gap-1.5 pb-2 text-sm text-success">
              <Check className="size-4" /> Deal found · {selectedHotel?.name ?? "Hotel"} — owner somchai.n@hotelplus.asia
            </p>
          )}
        </div>
      </Panel>

      <Panel
        title="Link Quotations"
        subtitle={
          hotel
            ? `showing ${hotelQuotes.length} quotes for ${selectedHotel?.name ?? hotel}`
            : "เลือกโรงแรมด้านบนก่อน จึงจะเห็นใบเสนอราคาของโรงแรมนั้น"
        }
      >
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>ดีลเดียวผูกได้หลายใบเสนอราคา (เช่น 1 ORM + 1 Marcom) — เมื่ออนุมัติทั้งคู่ ลูกค้าจะเซ็นสัญญา 2 ฉบับแยกกัน</p>
        </div>

        {!hotel ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            ยังไม่ได้เลือกโรงแรม
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Already linked ({linkedQuotes.length})
              </p>
              {linkedQuotes.length === 0 && (
                <p className="text-xs text-muted-foreground">ยังไม่มีใบเสนอราคาที่ผูกไว้</p>
              )}
              {linkedQuotes.map((q) => (
                <QuoteCard
                  key={q.quote_id}
                  quote={q}
                  linked
                  onToggle={() => setLinked((p) => p.filter((x) => x !== q.quote_id))}
                />
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Other available quotes for {selectedHotel?.name ?? hotel} ({availableQuotes.length})
              </p>
              {availableQuotes.length === 0 && (
                <p className="text-xs text-muted-foreground">ไม่มีใบเสนอราคาอื่นของโรงแรมนี้</p>
              )}
              {availableQuotes.map((q) => (
                <QuoteCard
                  key={q.quote_id}
                  quote={q}
                  onToggle={() => setLinked((p) => [...new Set([...p, q.quote_id])])}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function QuoteCard({ quote, linked, onToggle }: { quote: BdQuote; linked?: boolean; onToggle: () => void }) {
  const expired = quote.status === "expired";
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-sm",
        linked && "border-l-4 border-l-success",
        expired && "opacity-55",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="info">{quote.type}</Chip>
        <span className="font-semibold">{quote.quote_id}</span>
        <Chip tone={statusTone(quote.status)}>{statusLabel[quote.status]}</Chip>
        <span className="text-xs text-muted-foreground">
          สร้าง {fmtDate(quote.created_at)}
          {quote.sent_at ? ` · ส่ง ${fmtDate(quote.sent_at)}` : " · ยังไม่ส่ง"}
        </span>
        {expired ? (
          <span className="ml-auto text-xs text-destructive">Cannot link (expired)</span>
        ) : (
          <Button size="sm" variant={linked ? "ghost" : "outline"} className="ml-auto gap-1" onClick={onToggle}>
            {linked ? (
              <>
                <X className="size-4" /> Unlink
              </>
            ) : (
              <>
                <Link2 className="size-4" /> Link
              </>
            )}
          </Button>
        )}
      </div>

      <p className="mt-1 text-xs font-medium">{packageLabel(quote)}</p>

      <div className="mt-2 rounded-lg bg-surface/70 p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          SKUs in this quote ({quote.skus?.length ?? 0})
        </p>
        <ul className="mt-1 space-y-1">
          {(quote.skus ?? []).map((s) => (
            <li key={s.sku_code} className="flex flex-wrap items-baseline gap-2 text-xs">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{s.sku_code}</code>
              <span>{s.product_name}</span>
              <span className="text-muted-foreground">· {s.billing_summary}</span>
            </li>
          ))}
          {(quote.skus?.length ?? 0) === 0 && <li className="text-xs text-muted-foreground">ไม่มีรายการ SKU</li>}
        </ul>
      </div>
    </div>
  );
}
