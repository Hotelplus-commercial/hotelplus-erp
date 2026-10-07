import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { useContractLifecycle } from "@/lib/contract-lifecycle";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ServicingDashboard } from "@/components/ps/servicing-dashboard";
import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, JourneyBar } from "@/components/ps/meeting-ui";
import { OwnerLabel, Stage8Checklist } from "@/components/ps/onboarding-ui";
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


function OnboardingProcessPage() {
  const { role, month, setMonth } = useMeetingMgmt();
  const { onboardingCards } = useContractLifecycle();
  const allCards = [...onboardingCards, ...propertyCards, ...servicingCards];
  const hash = useRouterState({ select: (r) => r.location.hash });

  const [scope, setScope] = useState<"all" | "my">("all");
  const [q, setQ] = useState("");
  const [slaFilter, setSlaFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
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

  const stages = (isSpecialist ? specialistStages : preStages).filter(stage => stage.key !== "processing" && stage.key !== "completed" && stage.key !== "live");

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
        description=""
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

      <ServicingDashboard />

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
                              highlight === c.id && "border-primary bg-muted",
                            )}
                          >
                            <p className="truncate text-sm font-medium">{c.hotel}</p>
                            <OwnerLabel owner={c.owner} lastActionBy={c.lastActionBy} />
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Chip tone="muted">Day {c.daysInStage}</Chip>
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
                        <Chip tone="muted">{r.status === "Live" ? "Live" : "In progress"}</Chip>
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
                <p className="rounded-lg border bg-muted/40 p-2.5 text-xs">
                  การส่งมอบและงานบริการดำเนินการจาก Onboarding overview ด้านบน
                </p>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setApproveFor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success(
                      `อนุมัติ ${approveFor.hotel}`,
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
                    value={`${detail.daysInStage} วัน`}
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
