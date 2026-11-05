import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SurveyV2Form } from "@/components/ps/survey-v2-form";
import { LikertRow } from "@/components/ps/v4-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { answerByLink, expireLinks, findByToken, type TokenLookup } from "@/lib/meeting-survey-store";
import { SURVEY_OPEN_KEY } from "@/lib/email-templates";
import { v4SurveyQuestions } from "@/lib/ps-v4";
import { LINK_DEAD_MSG, LINK_UNKNOWN_MSG, emptyV2, templateVersionOf, v2AllUnsure, v2Complete, type V2Answers } from "@/lib/survey-v2";

/* Survey v2 patch §4 — public customer survey page (no login, token only).
 * Shows only hotel name, meeting date, AE display name and the questions. No database write: answers go to the
 * same browser store as AE Workspace (works in DEMO / the same browser). Real delivery to another device = portal. */
export const Route = createFileRoute("/l/survey/$token")({
  head: () => ({
    meta: [
      { title: "แบบสอบถามหลังประชุม | H+" },
      { name: "description", content: "แบบสอบถามความพึงพอใจหลังการประชุมประจำเดือน" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "แบบสอบถามหลังประชุม" },
      { property: "og:description", content: "แบบสอบถามความพึงพอใจหลังการประชุมประจำเดือน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicSurveyPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4 sm:p-8">{children}</main>;
}

function PublicSurveyPage() {
  const { token } = Route.useParams();
  const [look, setLook] = useState<TokenLookup | null>(null);
  const [done, setDone] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [v2, setV2] = useState<V2Answers>(emptyV2);

  useEffect(() => { expireLinks(true); expireLinks(false); setLook(findByToken(token)); }, [token]);

  if (!look) return <Shell><p className="text-sm text-muted-foreground">กำลังโหลด…</p></Shell>;
  if (done) return <Shell><div className="rounded-xl border p-6 text-center"><p className="text-lg font-semibold">ขอบคุณสำหรับคำตอบ</p><p className="mt-1 text-sm text-muted-foreground">เราได้รับคำตอบของคุณแล้ว</p></div></Shell>;
  if (look.status === "UNKNOWN") return <Shell><p className="rounded-xl border p-6 text-center" data-testid="link-msg">{LINK_UNKNOWN_MSG}</p></Shell>;
  if (look.status === "DEAD") return <Shell><p className="rounded-xl border p-6 text-center" data-testid="link-msg">{LINK_DEAD_MSG}</p></Shell>;

  const s = look.survey;
  const version = templateVersionOf(s);
  const section = s.service;
  const qs = v4SurveyQuestions.filter((q) => (q.section === section || q.section === "OVERALL") && q.key !== "Q8");
  const scored = qs.filter((q) => q.key !== SURVEY_OPEN_KEY);
  const complete = version === 2 ? v2Complete(section, v2) || v2AllUnsure(section, v2) : scored.every((q) => scores[q.key] !== undefined);
  const submit = () => {
    const r = answerByLink(token, version === 2 ? { v2 } : { v1: { scores, comment } });
    if (r.ok) setDone(true); else setLook(findByToken(token));
  };

  return (
    <Shell>
      <header className="rounded-xl border p-4">
        <p className="text-xs text-muted-foreground">แบบสอบถามหลังประชุม</p>
        <h1 className="text-xl font-semibold">{s.hotel}</h1>
        <p className="text-sm text-muted-foreground">วันที่ประชุม {s.meeting_date}{s.ae_display ? ` · AE ${s.ae_display}` : ""}</p>
      </header>
      {version === 2 ? (
        <SurveyV2Form service={section} value={v2} onChange={setV2} />
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border p-4">
          {qs.map((q) => (
            <div key={q.key}>
              <Label className="text-sm font-normal">{q.text}</Label>
              {q.key === SURVEY_OPEN_KEY
                ? <Textarea className="mt-1.5" value={comment} onChange={(e) => setComment(e.target.value)} />
                : <LikertRow value={scores[q.key] ?? null} onChange={(n) => setScores((p) => ({ ...p, [q.key]: n }))} />}
            </div>
          ))}
        </div>
      )}
      <Button disabled={!complete} onClick={submit}>ส่งคำตอบ</Button>
    </Shell>
  );
}
