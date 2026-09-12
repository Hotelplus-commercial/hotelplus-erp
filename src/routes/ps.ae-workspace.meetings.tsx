import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, HotelStatusBadge, TierBadge } from "@/components/ps/meeting-ui";
import { TypeBadge } from "@/components/ps/v4-ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  allMeetings,
  currentUserByRole,
  availableSlots,
  mmHotels,
  statusTone,
  useMeetingMgmt,
  type MeetingStatus,
} from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/ae-workspace/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — AE Workspace | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "รายการนัดหมาย ORM ทั้งหมด พร้อมฟิลเตอร์สถานะ tier สถานะโรงแรม และการร่าง/เลื่อนนัดหมาย",
      },
      { property: "og:title", content: "Meetings — AE Workspace" },
      {
        property: "og:description",
        content: "รายการนัดหมาย ORM ทั้งหมดของทีม AE พร้อมสถานะและ tier",
      },
    ],
  }),
  component: MeetingsTab,
});

const statusOptions: (MeetingStatus | "All")[] = [
  "All",
  "Draft",
  "Sent",
  "Confirmed",
  "Completed",
  "Postponed",
  "Postponed-Next-Month",
  "Declined",
  "No-show",
];

/** v4.0: deterministic ORM/Marcom type for prototype rows */
const meetingTypeOf = (id: string): "ORM" | "MARCOM" =>
  id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 4 === 0 ? "MARCOM" : "ORM";

function MeetingsTab() {
  const { role } = useMeetingMgmt();
  const [status, setStatus] = useState<string>("All");
  const [mtype, setMtype] = useState<string>("All");
  const [tier, setTier] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [multi, setMulti] = useState(false);
  const [hotel, setHotel] = useState<string>("");
  const [hotel2, setHotel2] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [note, setNote] = useState("");
  const [postponeFor, setPostponeFor] = useState<string | null>(null);
  const [scope, setScope] = useState<"my" | "team">("team");
  const me = currentUserByRole[role];

  const rows = useMemo(
    () =>
      allMeetings.filter(
        (m) =>
          (status === "All" || m.status === status) &&
          (mtype === "All" || meetingTypeOf(m.id) === (mtype === "ORM" ? "ORM" : "MARCOM")) &&
          (tier === "All" || m.tier === tier) &&
          (scope === "team" || m.ae === me) &&
          (search === "" ||
            m.hotel.toLowerCase().includes(search.toLowerCase()) ||
            (m.hotel2 ?? "").toLowerCase().includes(search.toLowerCase())),
      ),
    [status, mtype, tier, search, scope, me],
  );

  const selected = mmHotels.find((h) => h.name === hotel);
  const canSend = Boolean(hotel && slot && (!multi || hotel2));

  const reset = () => {
    setMulti(false);
    setHotel("");
    setHotel2("");
    setSlot("");
    setNote("");
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Meetings"
        title="Meetings"
        description="รายการนัดหมายทั้งหมด ค้นหาและกรองตามสถานะ tier สถานะโรงแรม หรือชื่อโรงแรม"
        actions={
          role === "AE" ? (
            <Button onClick={() => setDraftOpen(true)}>
              <Plus className="size-4" /> Draft New Meeting
            </Button>
          ) : undefined
        }
      />

      <Panel title="Meeting List" subtitle={`${rows.length} รายการ`}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mtype} onValueChange={setMtype}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Meeting Type" />
            </SelectTrigger>
            <SelectContent>
              {["All", "ORM", "Marcom"].map((t) => (
                <SelectItem key={t} value={t}>
                  Type: {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All tiers</SelectItem>
              <SelectItem value="A">Tier A</SelectItem>
              <SelectItem value="B">Tier B</SelectItem>
              <SelectItem value="C">Tier C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={(v) => setScope(v as "my" | "team")}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my">My hotels</SelectItem>
              <SelectItem value="team">Team</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อโรงแรม…"
              className="h-9 pl-8"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState text="ไม่พบนัดหมายตามเงื่อนไขที่เลือก" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Owner AE</TableHead>
                  <TableHead>Hotel Status</TableHead>
                  <TableHead>Tier · %</TableHead>
                  <TableHead>ORM</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Survey</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.hotel}
                      {m.hotel2 && (
                        <span className="text-muted-foreground"> + {m.hotel2}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={meetingTypeOf(m.id)} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{m.ae}</span>
                      {m.ae === me && (
                        <span className="ml-1 text-[11px] text-muted-foreground">(self)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <HotelStatusBadge status={m.hotelStatus ?? "Active"} />
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={m.tier} pct={m.tierPct} />
                    </TableCell>
                    <TableCell>{m.orm}</TableCell>
                    <TableCell>
                      {m.date}
                      {m.time ? ` · ${m.time}` : ""}
                      {m.carriedOver && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ยกยอดจากเดือนก่อน
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip tone={statusTone[m.status]}>{m.status}</Chip>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          m.survey === "—" && "text-muted-foreground",
                        )}
                      >
                        {m.survey}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info(`เปิดรายละเอียด ${m.hotel}`)}
                        >
                          View
                        </Button>
                        {role === "AE" &&
                          m.hotelStatus !== "NEW" &&
                          m.hotelStatus !== "REPORT ONLY" &&
                          (m.status === "Confirmed" || m.status === "Sent") && (
                            <Button size="sm" onClick={() => setPostponeFor(m.hotel)}>
                              Postpone
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing 1–{Math.min(10, rows.length)} of {rows.length} meetings
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled>
              Previous
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("หน้าถัดไป")}>
              Next
            </Button>
          </div>
        </div>
      </Panel>

      <Dialog
        open={draftOpen}
        onOpenChange={(o) => {
          setDraftOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft New Meeting</DialogTitle>
            <DialogDescription>
              ร่างนัดหมาย ORM แล้วส่งอีเมลพร้อมตัวเลือกเวลาให้ลูกค้าเลือก
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-xs">Hotel</Label>
              <Select value={hotel} onValueChange={setHotel}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกโรงแรม" />
                </SelectTrigger>
                <SelectContent>
                  {mmHotels.map((h) => (
                    <SelectItem key={h.name} value={h.name}>
                      {h.name} · Tier {h.tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox checked={multi} onCheckedChange={(v) => setMulti(v === true)} />
              Multi-property meeting (เจ้าของเดียวกัน · ประชุม 120 นาที)
            </Label>

            {multi && (
              <div>
                <Label className="text-xs">Second hotel</Label>
                <Select value={hotel2} onValueChange={setHotel2}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="เลือกโรงแรมที่สอง" />
                  </SelectTrigger>
                  <SelectContent>
                    {mmHotels
                      .filter((h) => h.name !== hotel)
                      .map((h) => (
                        <SelectItem key={h.name} value={h.name}>
                          {h.name} · Tier {h.tier}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hotel && (
              <p className="rounded-lg border border-primary/40 bg-primary/10 p-2.5 text-xs">
                🔵 คุณกำลัง draft meeting ให้โรงแรม {hotel} — ทุก action จะถูก log ในระบบ (actor{" "}
                {me})
              </p>
            )}

            {selected && (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p>
                  ORM: <span className="font-medium">{selected.orm}</span>
                </p>
                <p className="text-muted-foreground">Customer email: {selected.email}</p>
              </div>
            )}

            <div>
              <Label className="text-xs">Available slots (ลูกค้าจะเลือก 1 ช่วงเวลา)</Label>
              <div className="mt-2 flex flex-col gap-2">
                {availableSlots.map((s) =>
                  s.times.map((t) => {
                    const value = `${s.date} ${t}`;
                    return (
                      <button
                        key={value}
                        onClick={() => setSlot(value)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          slot === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted/60",
                        )}
                      >
                        {s.date} · {t}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Note to customer</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ข้อความเพิ่มเติมในอีเมลเชิญประชุม…"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                toast.success("บันทึกเป็น Draft แล้ว");
                setDraftOpen(false);
                reset();
              }}
            >
              Save Draft
            </Button>
            <Button
              disabled={!canSend}
              onClick={() => {
                toast.success(`ส่งอีเมลเชิญประชุมไปที่ ${selected?.email ?? "ลูกค้า"} แล้ว`);
                setDraftOpen(false);
                reset();
              }}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={postponeFor !== null} onOpenChange={(o) => !o && setPostponeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postpone Meeting — {postponeFor}</DialogTitle>
            <DialogDescription>
              เลื่อนภายในเดือนนี้ได้ถ้ายังไม่ถึงวันที่ 25 · หากเลยกำหนดระบบจะยกยอดไปเดือนถัดไปและนับเป็น
              Tier A ที่ยังไม่สำเร็จ
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                toast.success("เลื่อนภายในเดือนนี้ — ส่งช่วงเวลาใหม่ให้ลูกค้าแล้ว");
                setPostponeFor(null);
              }}
            >
              เลื่อนภายในเดือนนี้
            </Button>
            <Button
              onClick={() => {
                toast.info("ยกยอดเป็น Postponed-Next-Month และแจ้ง Partner Manager");
                setPostponeFor(null);
              }}
            >
              ยกยอดไปเดือนถัดไป
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
