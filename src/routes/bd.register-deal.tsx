import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Link2, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHotel, packageLabel, statusLabel, statusTone, useBd } from "@/lib/bd-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bd/register-deal")({
  head: () => ({
    meta: [
      { title: "Register Deal — BD App | Meridia Hotel ERP" },
      { name: "description", content: "ลงทะเบียนดีล เชื่อม Pipedrive Deal ID และผูกใบเสนอราคาหลายฉบับเข้าด้วยกัน" },
      { property: "og:title", content: "Register Deal — BD App" },
      { property: "og:description", content: "ลงทะเบียนดีลและผูกใบเสนอราคา ORM / Marcom" },
    ],
  }),
  component: RegisterDeal,
});

function RegisterDeal() {
  const { quotes, registerDeal } = useBd();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pipedriveId, setPipedriveId] = useState("");
  const [pipedriveOk, setPipedriveOk] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const hotelNames = useMemo(
    () => [...new Set(quotes.map((q) => q.hotel_name))].sort((a, b) => a.localeCompare(b)),
    [quotes],
  );

  const hits = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return quotes
      .filter(
        (q) =>
          !linked.includes(q.quote_id) &&
          (q.quote_id.toLowerCase().includes(term) || normalizeHotel(q.hotel_name).includes(term)),
      )
      .slice(0, 8);
  }, [quotes, search, linked]);

  const save = () => {
    if (!hotel.trim() || !pipedriveId.trim()) return toast.error("กรอกชื่อโรงแรมและ Pipedrive Deal ID ก่อน");
    if (linked.length === 0) return toast.error("ผูกใบเสนอราคาอย่างน้อย 1 ฉบับ");
    const id = registerDeal({
      hotel_name: hotel.trim(),
      room_key: Number(roomKey) || 0,
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
        <p className="text-sm text-muted-foreground">Quote เกิดก่อน Deal — ที่นี่คือขั้นตอนผูกดีลกับใบเสนอราคาที่มีอยู่</p>
        <Button className="gap-1.5" onClick={save}>
          <Save className="size-4" /> บันทึกดีล
        </Button>
      </div>

      <Panel title="Hotel Information">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อโรงแรม *</Label>
            <Input list="bd-hotels" value={hotel} onChange={(e) => setHotel(e.target.value)} />
            <datalist id="bd-hotels">
              {hotelNames.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Room key</Label>
            <Input type="number" value={roomKey} onChange={(e) => setRoomKey(e.target.value)} />
          </div>
        </div>
      </Panel>

      <Panel title="Contact Person">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อ-สกุล</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">อีเมล</Label>
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
              <Check className="size-4" /> Deal found · {hotel || "Hotel"} — owner somchai.n@hotelplus.asia
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Link Quotations" subtitle="ดีลเดียวผูกได้หลายใบเสนอราคา (เช่น 1 ORM + 1 Marcom)">
        <div className="space-y-2">
          {linked.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มีใบเสนอราคาที่ผูกไว้</p>}
          {linked.map((id) => {
            const q = quotes.find((x) => x.quote_id === id);
            if (!q) return null;
            return (
              <div key={id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm">
                <span className="font-semibold">{q.quote_id}</span>
                <Chip tone="info">{q.type}</Chip>
                <Chip tone={statusTone(q.status)}>{statusLabel[q.status]}</Chip>
                <span className="text-xs text-muted-foreground">{packageLabel(q)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1"
                  onClick={() => setLinked((p) => p.filter((x) => x !== id))}
                >
                  <X className="size-4" /> ยกเลิก
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="พิมพ์ Quote ID หรือชื่อโรงแรม…"
          />
          {hits.map((q) => {
            const expired = q.status === "expired";
            return (
              <div
                key={q.quote_id}
                className={cn("flex flex-wrap items-center gap-2 rounded-xl border p-3 text-sm", expired && "opacity-55")}
              >
                <span className="font-semibold">{q.quote_id}</span>
                <Chip tone="info">{q.type}</Chip>
                <Chip tone={statusTone(q.status)}>{statusLabel[q.status]}</Chip>
                <span className="text-xs text-muted-foreground">{q.hotel_name}</span>
                {expired ? (
                  <span className="ml-auto text-xs text-destructive">Cannot link expired</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto gap-1"
                    onClick={() => {
                      setLinked((p) => [...new Set([...p, q.quote_id])]);
                      setSearch("");
                    }}
                  >
                    <Link2 className="size-4" /> Link
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
