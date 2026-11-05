import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { EmptyState, TierBadge } from "@/components/ps/meeting-ui";
import { LikertRow, TypeBadge } from "@/components/ps/v4-ui";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SURVEY_OPEN_KEY, useTemplateMgmt } from "@/lib/email-templates";
import { monthOptions, scoreTone, useMeetingMgmt } from "@/lib/orm-meeting";
import {
  surveyFlagCards,
  surveySubStatuses,
  v4Color,
  v4SurveyQuestions,
  type MeetingType,
  type SurveyZoneCard,
} from "@/lib/ps-v4";
import { cn } from "@/lib/utils";
import { SurveyV2Form } from "@/components/ps/survey-v2-form";
import type { MeetingRecord, SurveyRecord } from "@/lib/meeting-survey-types";
import { createSurveyLink, expireLinks, msNow, saveNoScore, saveSurveyV1, saveSurveyV2, useMeetingSurveyData } from "@/lib/meeting-survey-store";
import { LINK_ACTION, LINK_ANSWERED_TAG, LINK_EXPIRED_TAG, NO_SCORE_CONFIRM, NO_SCORE_TH, SURVEY_TODO, emptyV2, isNoScore, linkSentTag, linkState, respondentOf, surveyRequired, v2AllUnsure, v2Complete, type V2Answers } from "@/lib/survey-v2";

export const Route = createFileRoute("/ps/ae-workspace/surveys")({
  head: () => ({
    meta: [
      { title: "Meeting Surveys — AE Workspace | Meridia" },
      {
        name: "description",
        content:
          "แบบสอบถามหลังประชุม ORM และ Marcom — คิวที่ต้องกรอก, คะแนนที่ส่งแล้ว และ flag ที่ต้องติดตาม",
      },
      { property: "og:title", content: "Meeting Surveys — AE Workspace" },
      { property: "og:description", content: "แบบสอบถามหลังประชุม ORM/Marcom และคะแนนความพึงพอใจ" },
    ],
  }),
  component: SurveysTab,
});

type QueueCard = SurveyZoneCard & { meeting: MeetingRecord; survey?: SurveyRecord };
type FormTarget = { card: QueueCard; preview: boolean };

/** Meeting record → the existing zone card shape (sample rows keep their original card). */
const toCard = (m: MeetingRecord, survey?: SurveyRecord): QueueCard => ({
  ...((m.raw as SurveyZoneCard | undefined) ?? { id: m.id, hotelId: m.hotel_id ?? "", hotel: m.hotel, tier: m.tier, type: m.service, date: m.date_label || m.date, attendees: m.ae_display ?? m.ae, contact: m.contact ?? "" }),
  meeting: m, survey,
});

function SurveysTab() {
  const { role, month, setMonth } = useMeetingMgmt();
  const [tier, setTier] = useState("All");
  const [type, setType] = useState("All");
  const [subStatus, setSubStatus] = useState<string>("All");
  const [form, setForm] = useState<FormTarget | null>(null);
  const tmStore = useTemplateMgmt();
  const { data, demo } = useMeetingSurveyData();
  const [linkFor, setLinkFor] = useState<SurveyRecord | null>(null);
  useEffect(() => { expireLinks(demo); }, [demo]);
  const now = msNow(demo);
  const surveyOf = (id: string) => data.surveys.find((x) => x.meeting_id === id);
  const queueMeetings = data.meetings.filter((m) => m.origin === "survey-queue" || m.origin === "demo" || m.origin === "booked");
  const allPending = queueMeetings
    .filter((m) => m.status === "Completed" && surveyRequired(m.channel))
    .map((m) => toCard(m, surveyOf(m.id)))
    .filter((c) => !c.survey || linkState(c.survey, now) === "OPEN");
  const surveyPending = allPending;
  const surveyUpcoming = queueMeetings.filter((m) => m.status !== "Completed" && m.origin === "survey-queue").map((m) => toCard(m));
  const surveySubmitted = data.surveys.filter((x) => x.submitted_at || isNoScore(x)).map((x) => ({
    id: x.id, hotel: x.hotel, tier: x.tier, type: x.service, meetingDate: x.meeting_date.length === 10 ? x.meeting_date.slice(5) : x.meeting_date,
    submitted: x.submitted_at ? (x.submitted_at.length > 10 && x.submitted_at.includes("T") ? x.submitted_at.slice(0, 10) : x.submitted_at) : "—",
    overall: x.overall, subStatus: x.customer_response_status, flags: x.flags, rec: x,
  }));
  const pendingKey = surveyPending.map((c) => c.id).join("|");
  useEffect(() => { tmStore.stampSurveys(surveyPending.map((c) => ({ id: c.id, key: c.type === "ORM" ? "ORM_MONTHLY" : "MARCOM_MONTHLY" }))); }, [tmStore, pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeOk = (t: MeetingType) => type === "All" || type === (t === "ORM" ? "ORM" : "Marcom");
  const tierOk = (t: string) => tier === "All" || tier === t;

  const upcoming = surveyUpcoming.filter((c) => typeOk(c.type) && tierOk(c.tier));
  const pending = surveyPending.filter((c) => typeOk(c.type) && tierOk(c.tier));
  const submitted = useMemo(
    () =>
      surveySubmitted.filter(
        (s) => typeOk(s.type) && tierOk(s.tier) && (subStatus === "All" || s.subStatus === subStatus),
      ),
    [type, tier, subStatus, data], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PS App · AE Workspace · Surveys"
        title="Post-Meeting Surveys"
        description="4 โซน: Inquiry (กำลังจะถึง) · Pending (ต้องกรอก) · Submitted (ส่งแล้ว) · Flagged — คะแนน ≤ 5 จะสร้าง flag อัตโนมัติ"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[160px]">
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
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All", "A", "B", "C", "—"].map((t) => (
                  <SelectItem key={t} value={t}>
                    Tier: {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All", "ORM", "Marcom"].map((t) => (
                  <SelectItem key={t} value={t}>
                    Type: {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Zone A — Inquiry / upcoming */}
      <Panel
        title={`Zone A · Survey Inquiry (${upcoming.length})`}
        subtitle="ประชุมที่กำลังจะถึง — คลิกการ์ดเพื่อดูตัวอย่างฟอร์ม (ยังส่งไม่ได้)"
      >
        {upcoming.length === 0 ? (
          <EmptyState text="ไม่มีประชุมที่กำลังจะถึงตามฟิลเตอร์นี้" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm({ card: c, preview: true })}
                className="rounded-xl border p-3 text-left transition-colors hover:bg-muted/60"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{c.hotel}</span>
                  <TypeBadge type={c.type} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.hotelId} · Tier {c.tier} · {c.date}
                </p>
                <p className="text-xs text-muted-foreground">{c.attendees}</p>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Zone B — Pending queue */}
      {(role === "AE" || role === "Partner Manager") && (
        <Panel
          title={`Zone B · Pending Survey Queue (${pending.length})`}
          subtitle="กรอกภายใน 24 ชั่วโมงหลังประชุม · เกิน 3 วันจะขึ้นเตือน"
        >
          {pending.length === 0 ? (
            <EmptyState text="ไม่มีแบบสอบถามค้างอยู่" />
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{p.hotel}</span>
                    <TypeBadge type={p.type} />
                    {p.tier !== "—" && <TierBadge tier={p.tier as "A" | "B" | "C"} />}
                    <span className="text-xs text-muted-foreground">ประชุมเมื่อ {p.date}</span>
                    {(p.daysAgo ?? 0) > 3 && <Chip tone="danger">⚠ ค้าง {p.daysAgo} วัน</Chip>}
                    <Chip tone="warn">{SURVEY_TODO}</Chip>
                    {p.survey?.link_expires_at && <Chip tone="info">{linkSentTag(p.survey.link_expires_at)}</Chip>}
                  </div>
                  {p.survey ? (
                    <Button size="sm" variant="outline" onClick={() => setLinkFor(p.survey!)}>ดูลิงก์</Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const r = createSurveyLink(p.meeting, tmStore.surveyVersion);
                        if (r.ok) setLinkFor(r.survey); else toast.error(r.error);
                      }}>{LINK_ACTION}</Button>
                      <Button size="sm" onClick={() => setForm({ card: p, preview: false })}>
                        Fill Survey →
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Zone C — Submitted */}
      <Panel title={`Zone C · Submitted Surveys (${submitted.length})`} subtitle="คะแนนที่ส่งแล้วในเดือนนี้">
        <div className="flex flex-wrap gap-2">
          {surveySubStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubStatus(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                subStatus === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {s} · {s === "All" ? surveySubmitted.length : surveySubmitted.filter((x) => x.subStatus === s).length}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Sub-status</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submitted.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.hotel}</TableCell>
                  <TableCell>
                    <TypeBadge type={s.type} />
                  </TableCell>
                  <TableCell>
                    {s.tier === "—" ? "—" : <TierBadge tier={s.tier as "A" | "B" | "C"} />}
                  </TableCell>
                  <TableCell>{s.meetingDate}</TableCell>
                  <TableCell>{s.submitted}</TableCell>
                  <TableCell>
                    {s.overall === null ? <span className="text-muted-foreground">—</span> : <Chip tone={scoreTone(s.overall)}>{s.overall.toFixed(1)}</Chip>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                    {isNoScore(s.rec) ? (
                      <span className="rounded-full border border-destructive/30 bg-muted px-2 py-0.5 text-xs font-semibold text-destructive" data-testid="pill-no-score">{NO_SCORE_TH}</span>
                    ) : s.subStatus && (
                    <Chip
                      tone={
                        s.subStatus === "Flagged"
                          ? "danger"
                          : s.subStatus === "Waiting Customer"
                            ? "warn"
                            : "success"
                      }
                    >
                      {s.subStatus}
                    </Chip>
                    )}
                    {s.rec.no_score_reason === "LINK_EXPIRED" && <Chip tone="muted">{LINK_EXPIRED_TAG}</Chip>}
                    {respondentOf(s.rec) === "CUSTOMER_LINK" && s.rec.no_score_reason !== "LINK_EXPIRED" && <Chip tone="info">{LINK_ANSWERED_TAG}</Chip>}
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

      {/* Zone D — Flagged (read-only awareness for AE) */}
      <Panel
        title={`Zone D · Flagged Surveys (${surveyFlagCards.length})`}
        subtitle="อ่านอย่างเดียว — โค้ชจะดำเนินการต่อในแท็บ Coaching"
      >
        <div className="grid gap-2 md:grid-cols-2">
          {surveyFlagCards.map((f) => (
            <div key={f.id} className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">🔴 {f.hotel}</span>
                <TypeBadge type={f.type} />
                <Chip tone="danger">
                  {f.question} score {f.score}
                </Chip>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Owner: {f.owner} · Route to: {f.route}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {form && <SurveyForm target={form} onClose={() => setForm(null)} />}
      {linkFor && <LinkDialog survey={linkFor} onClose={() => setLinkFor(null)} />}
    </div>
  );
}

function SurveyForm({ target, onClose }: { target: FormTarget; onClose: () => void }) {
  const { card, preview } = target;
  const sectionKey = card.type === "ORM" ? "ORM" : "MARCOM";
  const tm = useTemplateMgmt();
  const def = tm.surveyFor(card.id, sectionKey === "ORM" ? "ORM_MONTHLY" : "MARCOM_MONTHLY");
  const questions = v4SurveyQuestions
    .filter((q) => q.section === sectionKey || q.section === "OVERALL")
    .map((q) => ({ ...q, text: def.q[q.key] ?? q.text, open: q.key === SURVEY_OPEN_KEY ? true : q.open }));
  const scored = questions.filter((q) => !q.open);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [open9, setOpen9] = useState("");
  const [notes, setNotes] = useState("");

  const complete = scored.every((q) => scores[q.key] !== undefined);
  const lowCount = scored.filter((q) => (scores[q.key] ?? 10) <= 5).length;

  const sectionBg = (s: string) =>
    s === "ORM" ? v4Color.ormTint : s === "MARCOM" ? v4Color.marcomTint : "#F1F5F9";

  const groups: ("ORM" | "MARCOM" | "OVERALL")[] = [sectionKey as "ORM" | "MARCOM", "OVERALL"];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            📋 Survey — {card.hotel} · {card.date}
          </DialogTitle>
          <DialogDescription>
            Meeting Type: {card.type === "ORM" ? "🟦 ORM" : "🟪 Marcom"} · Attendees: {card.attendees},
            Customer (Contact: {card.contact})
            <span className="block text-[11px]">แม่แบบ v{def.version}{def.help ? ` · ${def.help}` : ""}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g} className="overflow-hidden rounded-xl border">
              <div className="px-3 py-2 text-sm font-bold" style={{ backgroundColor: sectionBg(g) }}>
                【 SECTION: {g === "OVERALL" ? def.overall_label : def.section_label} 】
              </div>
              <div className="flex flex-col gap-4 p-3">
                {questions
                  .filter((q) => q.section === g)
                  .map((q) => (
                    <div key={q.key}>
                      <Label className="text-sm font-normal">
                        {q.key}. {q.text}
                      </Label>
                      {q.open ? (
                        <Textarea
                          className="mt-1.5"
                          value={open9}
                          disabled={preview}
                          onChange={(e) => setOpen9(e.target.value)}
                          placeholder={def.open_placeholder}
                        />
                      ) : (
                        <>
                          <LikertRow
                            value={scores[q.key] ?? null}
                            disabled={preview}
                            onChange={(n) => setScores((p) => ({ ...p, [q.key]: n }))}
                          />
                          {(scores[q.key] ?? 10) <= 5 && (
                            <p className="mt-1 text-xs text-destructive">
                              คะแนนต่ำ — ระบบจะสร้าง flag และแจ้งโค้ชที่รับผิดชอบ
                            </p>
                          )}
                          {q.comment && (
                            <Input
                              className="mt-1.5"
                              disabled={preview}
                              value={comments[q.key] ?? ""}
                              onChange={(e) => setComments((p) => ({ ...p, [q.key]: e.target.value }))}
                              placeholder={def.comment_placeholder}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <div className="rounded-xl border p-3">
            <p className="text-sm font-semibold">【 Take Notes 】 (AE internal)</p>
            <Textarea
              className="mt-1.5"
              rows={3}
              disabled={preview}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This is for your internal reference only. Not shared with customer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    disabled={preview || !complete}
                    onClick={() => {
                      toast.success(
                        lowCount > 0
                          ? `✅ Survey submitted, customer notified · สร้าง ${lowCount} flag`
                          : "✅ Survey submitted, customer notified",
                      );
                      onClose();
                    }}
                  >
                    Submit Survey
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {preview
                  ? "Preview mode — ส่งได้เมื่อประชุมจบแล้ว"
                  : complete
                    ? "ส่งแบบสอบถาม"
                    : "ให้คะแนนทุกข้อที่จำเป็นก่อนส่ง"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
