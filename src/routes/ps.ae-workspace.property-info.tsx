import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, JourneyBar, SlaBadge } from "@/components/ps/meeting-ui";
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
import {
  preStages,
  propertyCards,
  servicingCards,
  servicingStages,
  specialistStages,
  useMeetingMgmt,
  type PropertyCard,
} from "@/lib/orm-meeting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ps/ae-workspace/property-info")({
  head: () => ({
    meta: [
      { title: "Property Info — AE Workspace | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "Kanban ติดตามสถานะ property ตั้งแต่ New Property จนถึง Survey Score พร้อม SLA และ journey ของโรงแรม",
      },
      { property: "og:title", content: "Property Info — AE Workspace" },
      {
        property: "og:description",
        content: "ติดตาม on-boarding pipeline ของโรงแรมพร้อม SLA และ property journey",
      },
    ],
  }),
  component: PropertyInfoTab,
});

function PropertyInfoTab() {
  const { role } = useMeetingMgmt();
  const isSpecialist = role === "On-boarding Specialist";
  const [view, setView] = useState<"pre" | "servicing">(isSpecialist ? "servicing" : "pre");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<PropertyCard | null>(null);

  const allCards = [...propertyCards, ...servicingCards];
  const stages = isSpecialist
    ? specialistStages
    : view === "pre"
      ? preStages
      : servicingStages;

  const cardsFor = (stageKey: string) =>
    allCards.filter(
      (c) => c.stage === stageKey && c.hotel.toLowerCase().includes(q.trim().toLowerCase()),
    );

  const overdue = allCards.filter((c) => c.overdue).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Property Info"
        title="Property On-boarding Pipeline"
        description="ติดตามสถานะโรงแรมใหม่ทีละขั้น — ทุกคอลัมน์มี SLA และแจ้งเตือนเมื่อค้างเกินกำหนด"
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาโรงแรม…"
              className="h-9 w-[200px]"
            />
            <Chip tone={overdue > 0 ? "danger" : "success"}>{overdue} overdue</Chip>
          </div>
        }
      />

      {!isSpecialist && (
        <div className="flex gap-1 self-start rounded-xl border bg-card p-1">
          {(
            [
              { key: "pre", label: "Pre-Services (AE)" },
              { key: "servicing", label: "Servicing (Read-only)" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
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

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {stages.map((s) => {
            const cards = cardsFor(s.key);
            return (
              <div key={s.key} className="w-[260px] shrink-0 rounded-xl border bg-card p-3">
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
                    cards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setDetail(c)}
                        className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/60"
                      >
                        <p className="truncate text-sm font-medium">{c.hotel}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          ในขั้นนี้ {c.daysInStage} วัน · {c.owner}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <SlaBadge overdue={c.overdue} days={c.daysInStage - c.slaDays} />
                          {c.score && <Chip tone="success">{c.score}</Chip>}
                          {c.readOnly && <Chip tone="muted">Read-only</Chip>}
                        </div>
                        {c.note && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">{c.note}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {allCards.length === 0 && <EmptyState text="ยังไม่มี property ในเดือนนี้" />}

      <Panel title="SLA Escalation" subtitle="กติกาแจ้งเตือนเมื่อการ์ดค้างเกิน SLA">
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>เกิน SLA → การ์ดขึ้นสีแดง และแจ้งเตือน AE เจ้าของงาน</li>
          <li>เกิน SLA 2 เท่า → แจ้ง Partner Manager และสร้าง flag ประเภท SLA Overdue</li>
          <li>Servicing เป็นข้อมูลอ่านอย่างเดียวสำหรับ AE — ทีมบริการเป็นผู้อัปเดต</li>
        </ul>
      </Panel>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.hotel}</DialogTitle>
                <DialogDescription>
                  {detail.location} · {detail.rooms} ห้อง · ผู้รับผิดชอบ {detail.owner}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <JourneyBar step={detail.journeyStep} signedDaysAgo={detail.signedDaysAgo} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="ประเภทห้อง" value={detail.roomTypes} />
                  <Info label="OTA ที่เชื่อมต่อ" value={detail.otas} />
                  <Info label="อยู่ในขั้นนี้" value={`${detail.daysInStage} วัน (SLA ${detail.slaDays} วัน)`} />
                  <Info label="สถานะ SLA" value={detail.overdue ? "เกินกำหนด" : "ตรงเวลา"} />
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-sm font-semibold">ประวัติการดำเนินงาน</p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                    {detail.history.map((h) => (
                      <li key={h.at + h.text}>
                        <span className="font-medium text-foreground">{h.at}</span> — {h.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter>
                {detail.readOnly ? (
                  <Chip tone="muted">Read-only สำหรับ AE</Chip>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => toast.info("ส่ง follow-up ให้โรงแรมแล้ว")}
                    >
                      Follow up
                    </Button>
                    <Button
                      onClick={() => {
                        toast.success(`${detail.hotel} → ${detail.action}`);
                        setDetail(null);
                      }}
                    >
                      {detail.action}
                    </Button>
                  </>
                )}
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
