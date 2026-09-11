import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, TierBadge } from "@/components/ps/meeting-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  mmSurveys,
  pendingSurveys,
  scoreTone,
  surveyQuestions,
  useMeetingMgmt,
} from "@/lib/orm-meeting";

export const Route = createFileRoute("/ps/ae-workspace/surveys")({
  head: () => ({
    meta: [
      { title: "Meeting Surveys — ORM Meeting Management | Meridia" },
      {
        name: "description",
        content: "แบบสอบถามหลังประชุม ORM — คิวที่ต้องกรอก, คะแนนที่ส่งแล้ว และ flag ที่ต้องติดตาม",
      },
      { property: "og:title", content: "Meeting Surveys — ORM Meeting Management" },
      { property: "og:description", content: "แบบสอบถามหลังประชุม ORM และคะแนนความพึงพอใจ" },
    ],
  }),
  component: SurveysTab,
});

const flatQuestions = surveyQuestions.flatMap((c) =>
  c.items.map((q) => ({ category: c.category, coach: c.coach, notify: c.notify, q })),
);

function SurveysTab() {
  const { role } = useMeetingMgmt();
  const [fillFor, setFillFor] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>(flatQuestions.map(() => 8));
  const [comment, setComment] = useState("");

  const setScore = (i: number, v: number) =>
    setScores((prev) => prev.map((s, idx) => (idx === i ? v : s)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · ORM Meeting Management · Surveys"
        title="Post-Meeting Surveys"
        description="เก็บคะแนนความพึงพอใจหลังประชุม 9 คำถาม 4 หมวด — คะแนนต่ำกว่า 6.5 จะสร้าง flag อัตโนมัติ"
      />

      {role === "AE" && (
        <Panel
          title={`Pending Survey Queue (${pendingSurveys.length})`}
          subtitle="กรอกภายใน 24 ชั่วโมงหลังประชุม"
        >
          {pendingSurveys.length === 0 ? (
            <EmptyState text="ไม่มีแบบสอบถามค้างอยู่" />
          ) : (
            <ul className="flex flex-col gap-2">
              {pendingSurveys.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{p.hotel}</span>
                    <TierBadge tier={p.tier} />
                    <span className="text-xs text-muted-foreground">
                      ประชุมเมื่อ {p.meetingDate}
                    </span>
                    {p.overdue && <Chip tone="danger">Overdue</Chip>}
                  </div>
                  <Button size="sm" onClick={() => setFillFor(p.hotel)}>
                    Fill Survey
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel title="Submitted Surveys" subtitle="คะแนนที่ส่งแล้วในเดือนนี้">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Confirmation</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mmSurveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.hotel}</TableCell>
                  <TableCell>
                    <TierBadge tier={s.tier} />
                  </TableCell>
                  <TableCell>{s.meetingDate}</TableCell>
                  <TableCell>{s.submitted}</TableCell>
                  <TableCell>
                    <Chip tone={scoreTone(s.overall)}>{s.overall.toFixed(1)}</Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Chip tone={s.confirmation === "Pending" ? "warn" : "success"}>
                        {s.confirmation}
                      </Chip>
                      {s.confirmationHint && (
                        <span className="text-xs text-muted-foreground">{s.confirmationHint}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.flags > 0 ? (
                      <Chip tone="danger">{s.flags} flags</Chip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Dialog
        open={fillFor !== null}
        onOpenChange={(o) => {
          if (!o) {
            setFillFor(null);
            setScores(flatQuestions.map(() => 8));
            setComment("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post-Meeting Survey — {fillFor}</DialogTitle>
            <DialogDescription>
              ให้คะแนน 1–10 ต่อข้อ · คะแนนต่ำกว่า 6.5 จะสร้าง flag และแจ้งผู้รับผิดชอบอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {surveyQuestions.map((cat) => (
              <div key={cat.category} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{cat.category}</p>
                  <Chip tone="muted">{cat.coach}</Chip>
                </div>
                <div className="mt-3 flex flex-col gap-4">
                  {cat.items.map((q) => {
                    const idx = flatQuestions.findIndex(
                      (f) => f.category === cat.category && f.q === q,
                    );
                    const value = scores[idx] ?? 8;
                    return (
                      <div key={q}>
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-sm font-normal">{q}</Label>
                          <Chip tone={scoreTone(value)}>{value}</Chip>
                        </div>
                        <Slider
                          className="mt-2"
                          min={1}
                          max={10}
                          step={1}
                          value={[value]}
                          onValueChange={(v) => setScore(idx, v[0] ?? 8)}
                        />
                        {value < 6.5 && (
                          <p className="mt-1 text-xs text-destructive">
                            คะแนนต่ำ — ระบบจะ {cat.notify}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div>
              <Label className="text-xs">Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ความเห็นเพิ่มเติมจากลูกค้า…"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                const low = scores.filter((s) => s < 6.5).length;
                toast.success(
                  low > 0 ? `ส่งแบบสอบถามแล้ว · สร้าง ${low} flag` : "ส่งแบบสอบถามแล้ว",
                );
                setFillFor(null);
                setScores(flatQuestions.map(() => 8));
                setComment("");
              }}
            >
              Submit Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
