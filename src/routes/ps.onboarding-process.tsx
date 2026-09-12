import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, JourneyBar, SlaBadge } from "@/components/ps/meeting-ui";
import { OwnerLabel, Stage8Checklist, Stage8SlaBadge } from "@/components/ps/onboarding-ui";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
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
  aeUsers,
  avgProcessing,
  currentUserByRole,
  monthOptions,
  opHistory,
  opMetrics,
  opStatusFilters,
  preStages,
  propertyCards,
  recentlyApproved,
  servicingCards,
  servicingStages,
  specialistStages,
  specialistTeam,
  useMeetingMgmt,
  type OpHistoryRow,
  type PropertyCard,
} from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

const description =
  "On-boarding Process: จัดการ property onboarding ตลอด lifecycle — Dashboard, Pipeline พร้อม Stage 8 checklist และ History";

export const Route = createFileRoute("/ps/onboarding-process")({
  head: () => ({
    meta: [
      { title: "On-boarding Process — PS App | Meridia Hotel ERP" },
      { name: "description", content: description },
      { property: "og:title", content: "On-boarding Process — PS App" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingProcessPage,
});

const allCards = [...propertyCards, ...servicingCards];

function OnboardingProcessPage() {
  const { role, month, setMonth } = useMeetingMgmt();
  const hash = useRouterState({ select: (r) => r.location.hash });

  const [scope, setScope] = useState<"all" | "my">("all");
  const [q, setQ] = useState("");
  const [slaFilter, setSlaFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [view, setView] = useState<"pre" | "servicing">("servicing");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [detail, setDetail] = useState<PropertyCard | null>(null);
  const [reviewFor, setReviewFor] = useState<PropertyCard | null>(null);
  const [approveFor, setApproveFor] = useState<PropertyCard | null>(null);
  const [feedback, setFeedback] = useState("");
  const [historyStatus, setHistoryStatus] = useState("All");
  const [historyAe, setHistoryAe] = useState("All");
  const [sortKey, setSortKey] = useState<keyof OpHistoryRow>("hotel");
  const [asc, setAsc] = useState(true);

  const isSpecialist = role === "On-boarding Specialist";
  const isAe = role === "AE";
  const me = currentUserByRole[role];

  useEffect(() => {
    const id = hash?.replace(/^#?hotel-/, "");
    if (!id) return;
    setHighlight(id);
    const el = document.getElementById(`hotel-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlight(null), 2400);
    return () => clearTimeout(t);
  }, [hash]);

  if (role === "ORM" || role === "GRM") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="PS App · On-boarding Process"
          title="On-boarding Process"
          description="เมนูนี้สำหรับทีม Partner Success"
        />
        <EmptyState text="ORM / GRM ใช้ ORM App สำหรับงาน servicing และ Stage 8 checklist" />
      </div>
    );
  }

  const stages = isSpecialist ? specialistStages : view === "pre" ? preStages : servicingStages;

  const visible = allCards.filter((c) => {
    if (scope === "my" && isAe && c.owner !== me) return false;
    if (q && !c.hotel.toLowerCase().includes(q.trim().toLowerCase())) return false;
    if (slaFilter === "Overdue" && !c.overdue) return false;
    if (slaFilter === "On-time" && c.overdue) return false;
    if (ownerFilter !== "All" && c.owner !== ownerFilter) return false;
    return true;
  });

  const historyRows = useMemo(() => {
    const rows = opHistory.filter(
      (r) =>
        (historyStatus === "All" ||
          (historyStatus === "Go Lived" && r.status === "Live") ||
          (historyStatus === "In Progress" && r.status !== "Live") ||
          (historyStatus === "Approved" && r.goLived === "—")) &&
        (historyAe === "All" || r.owner === historyAe),
    );
    return [...rows].sort((a, b) =>
      asc
        ? String(a[sortKey]).localeCompare(String(b[sortKey]))
        : String(b[sortKey]).localeCompare(String(a[sortKey])),
    );
  }, [historyStatus, historyAe, sortKey, asc]);

  const actionFor = (c: PropertyCard) => {
    if (c.stage === "check1" && isSpecialist) return { label: "Review", fn: () => setReviewFor(c) };
    if (c.stage === "final" && (isSpecialist || role === "Partner Manager"))
      return { label: "Approve", fn: () => setApproveFor(c) };
    return { label: "View Details", fn: () => setDetail(c) };
  };

  const sortBtn = (key: keyof OpHistoryRow, label: string) => (
    <button
      type="button"
      className="flex items-center gap-1 font-medium"
      onClick={() => {
        setSortKey(key);
        setAsc(sortKey === key ? !asc : true);
      }}
    >
      {label} <ArrowUpDown className="size-3" />
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="PS App · On-boarding Process"
        title="On-boarding Process"
        description="จัดการ property onboarding ตลอด lifecycle — Dashboard · Pipeline · History"
        actions={
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as "all" | "my")}
              disabled={!isAe}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hotels</SelectItem>
                <SelectItem value="my">My hotels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* SECTION B1 — Dashboard */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Dashboard</h2>
          <span className="text-xs text-muted-foreground">Last updated: 2 min ago</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {opMetrics.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => {
                document.getElementById("op-pipeline")?.scrollIntoView({ behavior: "smooth" });
                toast.info(`กรอง Pipeline: ${m.label}`);
              }}
              className="card-elevated p-4 text-left transition-colors hover:bg-muted/50"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-1 font-display text-3xl font-bold leading-none">{m.value}</p>
              <Chip tone={m.tone}>{m.sub}</Chip>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Team Specialists" subtitle="จำนวน property ที่ยังเปิดอยู่">
            <ul className="flex flex-col gap-2">
              {specialistTeam.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <Chip tone={s.open >= 8 ? "warn" : "muted"}>{s.open} open properties</Chip>
                </li>
              ))}
            </ul>
            <Button
              variant="link"
              size="sm"
              className="mt-2 px-0"
              onClick={() => toast.info("เปิดรายงานผลงานทีม Specialist")}
            >
              View Full Performance →
            </Button>
          </Panel>

          <Panel title="Avg Processing Time" subtitle="approved → go lived">
            <p className="font-display text-4xl font-bold leading-none">
              {avgProcessing.days} days
            </p>
            <Chip tone="success">Trend: {avgProcessing.trend}</Chip>
          </Panel>
        </div>

        <Panel title="Recently Approved" subtitle="อนุมัติภายใน 7 วันที่ผ่านมา">
          <ul className="flex flex-col gap-2">
            {recentlyApproved.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setHighlight(r.id);
                    document
                      .getElementById(`hotel-${r.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => setHighlight(null), 2400);
                  }}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="text-sm font-medium">{r.hotel}</span>
                  <span className="text-xs text-muted-foreground">{r.approved}</span>
                  <Chip tone="info">{r.stage}</Chip>
                  <span className="flex w-28 items-center gap-2">
                    <Progress value={r.progress} className="h-1.5 flex-1" />
                    <span className="text-[11px]">{r.progress}%</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* SECTION B2 — Pipeline */}
      <section id="op-pipeline" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Pipeline</h2>

        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
          <div className="relative min-w-[190px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาโรงแรม…"
              className="h-9 pl-8"
            />
          </div>
          <Select value={slaFilter} onValueChange={setSlaFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">SLA: All</SelectItem>
              <SelectItem value="On-time">On-time</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aeUsers.map((a) => (
                <SelectItem key={a} value={a}>
                  {a === "All" ? "Owner: All" : a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isSpecialist && (
            <div className="flex gap-1 rounded-lg border p-1">
              {(
                [
                  { key: "pre", label: "Pre-Services (6)" },
                  { key: "servicing", label: "Servicing (4)" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setView(t.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    view === t.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {stages.map((s) => {
              const cards = visible.filter((c) => c.stage === s.key);
              return (
                <div key={s.key} className="w-[280px] shrink-0 rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{s.title}</p>
                    <Chip tone="muted">{cards.length}</Chip>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">SLA {s.sla}</p>

                  <div className="mt-3 flex flex-col gap-2">
                    {cards.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        ว่าง
                      </p>
                    ) : (
                      cards.map((c) => {
                        const act = actionFor(c);
                        return (
                          <div
                            key={c.id}
                            id={`hotel-${c.id}`}
                            className={cn(
                              "rounded-lg border p-3 transition-colors",
                              highlight === c.id && "border-warning bg-warning/15",
                            )}
                          >
                            <p className="truncate text-sm font-medium">{c.hotel}</p>
                            <OwnerLabel owner={c.owner} lastActionBy={c.lastActionBy} />
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {c.stage === "processing" ? (
                                <Stage8SlaBadge days={c.daysInStage} slaDays={c.slaDays} />
                              ) : (
                                <SlaBadge
                                  overdue={c.overdue}
                                  days={c.daysInStage - c.slaDays}
                                />
                              )}
                              {c.score && <Chip tone="success">{c.score}</Chip>}
                            </div>
                            {c.stage === "processing" && (
                              <div className="mt-2">
                                <Stage8Checklist card={c} />
                              </div>
                            )}
                            <div className="mt-2 flex gap-1.5">
                              <Button size="sm" variant="outline" onClick={act.fn}>
                                {act.label}
                              </Button>
                              {c.stage === "processing" && role === "Partner Manager" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toast.info("PM override — ระบุเหตุผลในการแก้ checklist")}
                                >
                                  PM override
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION B3 — History */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">History</h2>
        <Panel
          title="On-boarding History"
          subtitle={`${historyRows.length} รายการ · ${month}`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={historyStatus} onValueChange={setHistoryStatus}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opStatusFilters.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "All" ? "Status: All" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={historyAe} onValueChange={setHistoryAe}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aeUsers.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a === "All" ? "AE: All" : a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("ส่งออกไฟล์ CSV แล้ว")}
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </div>
          }
        >
          {historyRows.length === 0 ? (
            <EmptyState text="ยังไม่มีข้อมูลในเดือนนี้" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{sortBtn("hotel", "Hotel")}</TableHead>
                    <TableHead>{sortBtn("owner", "Owner AE")}</TableHead>
                    <TableHead>{sortBtn("approved", "Approved")}</TableHead>
                    <TableHead>{sortBtn("goLived", "Go Lived")}</TableHead>
                    <TableHead>{sortBtn("duration", "Duration")}</TableHead>
                    <TableHead>{sortBtn("status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => {
                        const card = allCards.find((c) => c.hotel === r.hotel);
                        if (card) setDetail(card);
                        else toast.info(`${r.hotel} — ${r.statusText}`);
                      }}
                    >
                      <TableCell className="font-medium">{r.hotel}</TableCell>
                      <TableCell>{r.owner}</TableCell>
                      <TableCell>{r.approved}</TableCell>
                      <TableCell>{r.goLived}</TableCell>
                      <TableCell>{r.duration}</TableCell>
                      <TableCell>
                        <Chip
                          tone={
                            r.status === "Live"
                              ? "success"
                              : r.status === "SLA"
                                ? "danger"
                                : "warn"
                          }
                        >
                          {r.statusText}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </section>

      {/* Review modal */}
      <Dialog open={reviewFor !== null} onOpenChange={(o) => !o && setReviewFor(null)}>
        <DialogContent>
          {reviewFor && (
            <>
              <DialogHeader>
                <DialogTitle>Review 1st Check — {reviewFor.hotel}</DialogTitle>
                <DialogDescription>Owner AE: {reviewFor.owner}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p>
                    {reviewFor.rooms} ห้อง · {reviewFor.location}
                  </p>
                  <p className="text-muted-foreground">
                    {reviewFor.roomTypes} · OTA: {reviewFor.otas}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Feedback (จำเป็น) — ระบุจุดที่ต้องแก้</Label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setReviewFor(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={feedback.trim() === ""}
                  onClick={() => {
                    toast.success(
                      `ส่ง feedback ให้ ${reviewFor.owner} — ${reviewFor.hotel} → Property Pending`,
                    );
                    setFeedback("");
                    setReviewFor(null);
                  }}
                >
                  Send Feedback
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve modal */}
      <Dialog open={approveFor !== null} onOpenChange={(o) => !o && setApproveFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {approveFor && (
            <>
              <DialogHeader>
                <DialogTitle>Approve Final Check — {approveFor.hotel}</DialogTitle>
                <DialogDescription>Owner AE: {approveFor.owner}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 text-sm">
                <div className="rounded-xl border p-3">
                  <p className="font-medium">Foundation data</p>
                  <p className="text-muted-foreground">
                    {approveFor.rooms} ห้อง · {approveFor.location} · {approveFor.roomTypes}
                  </p>
                  <p className="text-muted-foreground">OTA: {approveFor.otas}</p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-muted-foreground">
                  <p className="font-medium text-foreground">Master Prompt preview</p>
                  <p>AI brief จะถูกสร้างอัตโนมัติหลังอนุมัติ</p>
                </div>
                <ul className="flex flex-col gap-1.5">
                  <li className="rounded-lg border p-2.5">🎫 Ticket to ORM App — brief + property data</li>
                  <li className="rounded-lg border p-2.5">🎫 Ticket to Marcom App — brief + property data</li>
                </ul>
                <p className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs">
                  ⚠️ การ approve จะเริ่มนับ Stage 8 SLA 7 วัน และส่ง ticket ให้ทีม ORM + Marcom ทันที
                </p>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setApproveFor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success(
                      `อนุมัติ ${approveFor.hotel} — เริ่ม Stage 8 SLA และส่ง ticket แล้ว`,
                    );
                    setApproveFor(null);
                  }}
                >
                  Confirm Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Card detail */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.hotel}</DialogTitle>
                <DialogDescription>
                  {detail.location} · {detail.rooms} ห้อง
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <OwnerLabel owner={detail.owner} lastActionBy={detail.lastActionBy} />
                <JourneyBar step={detail.journeyStep} signedDaysAgo={detail.signedDaysAgo} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="ประเภทห้อง" value={detail.roomTypes} />
                  <Info label="OTA ที่เชื่อมต่อ" value={detail.otas} />
                  <Info
                    label="อยู่ในขั้นนี้"
                    value={`${detail.daysInStage} วัน (SLA ${detail.slaDays} วัน)`}
                  />
                  <Info label="Specialist / ORM" value={`${detail.specialist ?? "—"} / ${detail.orm ?? "—"}`} />
                </div>
                {detail.stage === "processing" && <Stage8Checklist card={detail} />}
                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">Stage history</p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                    {detail.history.map((h) => (
                      <li key={h.at + h.text}>
                        <span className="font-medium text-foreground">{h.at}</span> — {h.text}
                        {detail.lastActionBy && (
                          <span> · by {detail.lastActionBy} (actor) — owner: {detail.owner}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  ปิด
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
