import { createFileRoute } from "@tanstack/react-router";
import { Lock, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { MeetingCard, TypeBadge } from "@/components/ps/v4-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { septemberDays, slotTimes, useMeetingMgmt } from "@/lib/orm-meeting";
import {
  marcomUnassigned,
  ormUnassignedByTier,
  pipelineStatuses,
  v4CalendarCards,
  v4Color,
  v4OrmTeams,
  v4People,
  marcomStaff,
  ormStaff,
  type MeetingCardV4,
} from "@/lib/ps-v4";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/ae-workspace/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — AE Workspace | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "ปฏิทินนัดหมาย ORM และ Marcom — sync, ช่องเวลาว่าง, ฟิลเตอร์ 4 ชั้น, Un-assign Box และการร่าง/ยืนยันนัด",
      },
      { property: "og:title", content: "Calendar — AE Workspace" },
      {
        property: "og:description",
        content: "ปฏิทิน ORM/Marcom พร้อม Un-assign Box, slot overlay และ bulk re-send",
      },
    ],
  }),
  component: CalendarTab,
});

type Dept = "All" | "ORM" | "Marcom";

const statusOfLabel: Record<string, MeetingCardV4["status"] | "ALL"> = {
  "Not Assign": "NOT_ASSIGN",
  Draft: "DRAFT",
  "Waiting Confirm": "DRAFT",
  Confirmed: "CONFIRMED",
  Completed: "CONFIRMED",
  Rejected: "REJECTED",
  Postponed: "POSTPONED",
};

function CalendarTab() {
  const { role, month } = useMeetingMgmt();
  const isPm = role === "Partner Manager";

  const [dept, setDept] = useState<Dept>("All");
  const [team, setTeam] = useState("All");
  const [person, setPerson] = useState("All");
  const [status, setStatus] = useState("All");
  const [slotView, setSlotView] = useState<"Off" | "All" | "ORM" | "Marcom">("All");
  const [unassignTab, setUnassignTab] = useState<"ORM" | "Marcom">("ORM");
  const [openTiers, setOpenTiers] = useState<Record<string, boolean>>({ A: true, B: false, C: false });
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [closedSlots, setClosedSlots] = useState<string[]>(["14-2"]);
  const [menu, setMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const [detail, setDetail] = useState<MeetingCardV4 | null>(null);
  const [sync, setSync] = useState({ orm: "12 Sep 2026 09:12", marcom: "12 Sep 2026 08:40" });
  const [syncing, setSyncing] = useState<"orm" | "marcom" | null>(null);

  const teamOptions = useMemo(() => {
    if (dept === "Marcom") return ["All", "Marcom"];
    if (dept === "ORM") return ["All", ...v4OrmTeams];
    return ["All", ...v4OrmTeams, "Marcom"];
  }, [dept]);

  const personOptions = useMemo(() => {
    if (dept === "ORM") return ["All", ...ormStaff.map((o) => o.code)];
    if (dept === "Marcom") return ["All", ...marcomStaff.map((m) => m.code)];
    return ["All", ...v4People];
  }, [dept]);

  const matches = (c: MeetingCardV4) =>
    (dept === "All" || (dept === "ORM" ? c.type === "ORM" : c.type === "MARCOM")) &&
    (team === "All" || c.team === team) &&
    (person === "All" || c.owner === person) &&
    (status === "All" || statusOfLabel[status] === c.status);

  const counts = pipelineStatuses.map((s) => ({
    label: s,
    value: v4CalendarCards.filter((c) => statusOfLabel[s] === c.status).length,
  }));

  const draftSelected = selected.length > 0;

  const runSync = (which: "orm" | "marcom") => {
    if (isPm) {
      toast.info("PM ดูได้แต่ไม่สามารถกด sync แทน AE");
      return;
    }
    setSyncing(which);
    setTimeout(() => {
      const stamp = "12 Sep 2026 09:45";
      setSync((s) => ({ ...s, [which]: stamp }));
      setSyncing(null);
      toast.success(which === "orm" ? "Sync ORM สำเร็จ — ดึง 8 events" : "Sync Marcom สำเร็จ — ดึง 5 events");
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4" onClick={() => setMenu(null)}>
      <PageHeader
        eyebrow="PS App · AE Workspace · Calendar"
        title="Meeting Calendar (ORM · Marcom)"
        description="ปฏิทินรวม ORM และ Marcom — ลากการ์ดจาก Un-assign Box ลงช่องเวลาเพื่อสร้าง DRAFT, ORM/ลูกค้ายืนยันแล้วจึงเป็น CONFIRMED"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-right text-[11px] leading-tight text-muted-foreground">
              <p>ORM sync: {sync.orm}</p>
              <p>Marcom sync: {sync.marcom}</p>
            </div>
            <Button size="sm" variant="outline" disabled={syncing !== null} onClick={() => runSync("orm")}>
              <RefreshCw className={cn("size-4", syncing === "orm" && "animate-spin")} /> Sync All ORM
            </Button>
            <Button size="sm" variant="outline" disabled={syncing !== null} onClick={() => runSync("marcom")}>
              <RefreshCw className={cn("size-4", syncing === "marcom" && "animate-spin")} /> Sync All Marcom
            </Button>
          </div>
        }
      />

      {/* Status summary tabs — click = shortcut filter */}
      <Panel title={`Status Summary — ${month}`} subtitle="คลิกเพื่อกรองสถานะทันที">
        <div className="flex flex-wrap gap-2">
          {[{ label: "All", value: v4CalendarCards.length }, ...counts].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStatus(s.label)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                status === s.label ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {s.label} · {s.value}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            value={dept}
            onValueChange={(v) => {
              setDept(v as Dept);
              setTeam("All");
              setPerson("All");
            }}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {(["All", "ORM", "Marcom"] as Dept[]).map((d) => (
                <SelectItem key={d} value={d}>
                  Dept: {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teamOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  Team: {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent>
              {personOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={slotView} onValueChange={(v) => setSlotView(v as typeof slotView)}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue placeholder="Available slots" />
            </SelectTrigger>
            <SelectContent>
              {(["Off", "All", "ORM", "Marcom"] as const).map((v) => (
                <SelectItem key={v} value={v}>
                  Available slots: {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            ฟิลเตอร์ใช้ตรรกะ AND · การ์ดที่ไม่ตรงจะจางลงแต่ยังคลิกดูได้
          </span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Panel
          title="September 2026"
          subtitle="คลิกขวาที่ช่องเวลาเพื่อปิด/เปิดช่วงเวลา · ลากการ์ดจาก Un-assign Box มาวางเพื่อสร้าง DRAFT"
          right={
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded" style={{ background: v4Color.ormFill }} /> Confirmed ORM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded" style={{ background: v4Color.marcomFill }} /> Confirmed Marcom
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded border-2"
                  style={{ background: v4Color.draftFill, borderColor: v4Color.draftBorder }}
                />{" "}
                Draft
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded" style={{ background: v4Color.freeSlot }} /> Free slot
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded" style={{ background: v4Color.busySlot }} /> Busy slot
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            <span />
            {septemberDays.map((d) => (
              <div
                key={d.day}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  const all = [...ormUnassignedByTier("A"), ...ormUnassignedByTier("B"), ...ormUnassignedByTier("C"), ...marcomUnassigned];
                  const card = all.find((c) => c.id === id);
                  if (card) toast.success(`ร่างนัด ${card.hotel} วันที่ ${d.day} Sep — สถานะ DRAFT`);
                }}
                className={cn(
                  "min-h-[120px] rounded-lg border p-1.5",
                  d.state === "cutoff" && "border-destructive/30 bg-destructive/5",
                  d.state === "dayoff" && "bg-muted",
                  d.state === "past" && "opacity-60",
                )}
              >
                <span className="text-xs font-semibold">{d.day}</span>

                {slotView !== "Off" && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {d.slots.map((s, i) => {
                      const key = `${d.day}-${i}`;
                      const closed = closedSlots.includes(key);
                      const free = s === "available" && !closed;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={
                            closed
                              ? "ปิดด้วยตนเอง (manually closed)"
                              : free
                                ? `ว่าง ${slotTimes[i]}`
                                : `ไม่ว่าง (${s})`
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMenu({ key, x: e.clientX, y: e.clientY });
                          }}
                          className={cn(
                            "flex items-center justify-between truncate rounded px-1 py-0.5 text-[10px]",
                            closed && "font-semibold text-muted-foreground",
                          )}
                          style={{
                            backgroundColor: closed ? "#CBD5E1" : free ? v4Color.freeSlot : v4Color.busySlot,
                          }}
                        >
                          <span>{slotTimes[i]}</span>
                          {closed && <Lock className="size-2.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-1 flex flex-col gap-1">
                  {v4CalendarCards
                    .filter((c) => c.day === d.day)
                    .map((c) => (
                      <MeetingCard
                        key={c.id}
                        card={c}
                        compact
                        dimmed={!matches(c)}
                        selected={selected.includes(c.id)}
                        onSelect={
                          c.status === "DRAFT"
                            ? () =>
                                setSelected((prev) =>
                                  prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                                )
                            : undefined
                        }
                        onClick={() => setDetail(c)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          {draftSelected && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2.5">
              <span className="text-sm font-medium">เลือกไว้ {selected.length} การ์ด (DRAFT)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected([])}>
                  ล้างการเลือก
                </Button>
                <Button size="sm" onClick={() => setBulkOpen(true)}>
                  Re-send Calendar
                </Button>
              </div>
            </div>
          )}
        </Panel>

        {/* Un-assign Box */}
        <Panel title="Un-assign Box" subtitle="โรงแรมที่ยังไม่มีนัดในเดือนนี้">
          <Tabs value={unassignTab} onValueChange={(v) => setUnassignTab(v as "ORM" | "Marcom")}>
            <TabsList className="w-full">
              <TabsTrigger value="ORM" className="flex-1">
                🟦 ORM Meetings
              </TabsTrigger>
              <TabsTrigger value="Marcom" className="flex-1">
                🟪 Marcom Meetings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-3 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
            {unassignTab === "ORM"
              ? (["A", "B", "C"] as const).map((tier) => {
                  const cards = ormUnassignedByTier(tier);
                  return (
                    <div key={tier} className="rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setOpenTiers((p) => ({ ...p, [tier]: !p[tier] }))}
                        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-semibold"
                      >
                        <span>
                          Tier {tier} {tier === "A" ? "(Required)" : "(Optional)"} · {cards.length}
                        </span>
                        <span className="text-muted-foreground">{openTiers[tier] ? "▾" : "▸"}</span>
                      </button>
                      {openTiers[tier] && (
                        <div className="flex flex-col gap-1.5 p-1.5">
                          {cards.map((c) => (
                            <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}>
                              <MeetingCard card={c} dimmed={!matches(c)} onClick={() => setDetail(c)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              : marcomUnassigned.map((c) => (
                  <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}>
                    <MeetingCard card={c} dimmed={!matches(c)} onClick={() => setDetail(c)} />
                  </div>
                ))}
          </div>
        </Panel>
      </div>

      {/* right-click context menu */}
      {menu && (
        <div
          className="fixed z-50 w-52 overflow-hidden rounded-lg border bg-popover p-1 text-sm shadow-md"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: "Mark unavailable", act: () => setClosedSlots((p) => [...new Set([...p, menu.key])]) },
            { label: "Add note", act: () => toast.info("บันทึกโน้ตช่วงเวลาแล้ว") },
            { label: "Reopen slot", act: () => setClosedSlots((p) => p.filter((k) => k !== menu.key)) },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                if (isPm) {
                  toast.info("ปิดช่วงเวลาได้เฉพาะปฏิทินของ AE เจ้าของ");
                } else {
                  o.act();
                }
                setMenu(null);
              }}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-send Calendar</DialogTitle>
            <DialogDescription>
              ส่งคำเชิญใหม่ให้ {selected.length} นัดที่เป็น DRAFT (จากการปฏิเสธ/เลื่อน) — สถานะจะเปลี่ยนเป็น
              CONFIRMED และไม่ trigger Report Automation
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(`ส่งปฏิทินใหม่ ${selected.length} นัด · สถานะ → CONFIRMED`);
                setSelected([]);
                setBulkOpen(false);
              }}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.hotel}</DialogTitle>
                <DialogDescription>
                  {detail.hotelId} · Tier {detail.tier}
                  {detail.day ? ` · ${detail.day} Sep ${detail.time}` : " · ยังไม่มีนัด"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={detail.type} />
                  <Chip tone="muted">{detail.status}</Chip>
                  <Chip tone="info">* {detail.requestedBy}</Chip>
                </div>
                <p>
                  ผู้รับผิดชอบ: {detail.owner} {detail.team !== "—" ? `· ${detail.team}` : ""}
                </p>
                {detail.note && <p className="text-muted-foreground">{detail.note}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => toast.info("ส่งคำขอเลื่อนนัดแล้ว")}>
                  Postpone
                </Button>
                <Button onClick={() => toast.success("ยืนยันนัดหมายแล้ว")}>Confirm</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
