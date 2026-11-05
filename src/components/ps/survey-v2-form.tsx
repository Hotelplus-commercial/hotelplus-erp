/* Survey template 2 (label survey) — shared by the AE survey form and the public customer page.
 * Chip text = label name; GOOD / BAD order randomised per form; ยังบอกไม่ได้ in the middle; never shows previous answers. */
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LabelChoice, MeetingService } from "@/lib/meeting-survey-types";
import { OPPORTUNITY_LABELS, OPPORTUNITY_NONE, UNSURE_TH, chipOrder, chipText, topicsFor, type V2Answers } from "@/lib/survey-v2";

function Chip({ on, children, onClick, disabled, testId }: { on: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean; testId?: string }) {
  return (
    <button type="button" disabled={disabled} data-testid={testId} aria-pressed={on} onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
      {children}
    </button>
  );
}

function ScoreRow({ value, onChange, unsure, disabled, name }: { value: number | "UNSURE" | null; onChange: (v: number | "UNSURE") => void; unsure?: boolean; disabled?: boolean; name: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1" aria-label={name}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" disabled={disabled} aria-pressed={value === n} onClick={() => onChange(n)}
          className={cn("flex size-8 items-center justify-center rounded-md border text-sm", value === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{n}</button>
      ))}
      {unsure && <Chip on={value === "UNSURE"} disabled={disabled} onClick={() => onChange("UNSURE")}>{UNSURE_TH}</Chip>}
    </div>
  );
}

export function SurveyV2Form({ service, value, onChange, disabled }: { service: MeetingService; value: V2Answers; onChange: (v: V2Answers) => void; disabled?: boolean }) {
  const topics = topicsFor(service);
  const [order] = useState<Record<string, LabelChoice[]>>(() => Object.fromEntries(topics.filter((t) => t.kind === "pair").map((t) => [t.key, chipOrder(t)])));
  const set = (patch: Partial<V2Answers>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3" data-testid="survey-v2-form">
      {topics.map((t) => (
        <div key={t.key} className="rounded-xl border p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t.name}</p>
          <p className="text-sm">{t.script}</p>
          {t.kind === "pair" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {order[t.key].map((c) => (
                <Chip key={c} testId={`chip-${t.key}-${c.toLowerCase()}`} on={value.choices[t.key] === c} disabled={disabled} onClick={() => set({ choices: { ...value.choices, [t.key]: c } })}>{chipText(t, c)}</Chip>
              ))}
            </div>
          )}
          {t.key === "OVERALL" && <ScoreRow name={t.name} unsure value={value.overall} disabled={disabled} onChange={(v) => set({ overall: v })} />}
          {t.key === "RECOMMEND" && <ScoreRow name={t.name} value={value.recommend} disabled={disabled} onChange={(v) => set({ recommend: v === "UNSURE" ? null : v })} />}
          {t.kind === "multi" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {OPPORTUNITY_LABELS.map((o) => (
                <Chip key={o} on={value.opportunity.includes(o)} disabled={disabled} onClick={() => set({ opportunity: value.opportunity.includes(o) ? value.opportunity.filter((x) => x !== o) : [...value.opportunity.filter((x) => x !== OPPORTUNITY_NONE), o] })}>{o}</Chip>
              ))}
              <Chip on={value.opportunity.includes(OPPORTUNITY_NONE)} disabled={disabled} onClick={() => set({ opportunity: [OPPORTUNITY_NONE] })}>{OPPORTUNITY_NONE}</Chip>
            </div>
          )}
          {t.kind === "text" && <Textarea className="mt-2" disabled={disabled} value={value.comment} onChange={(e) => set({ comment: e.target.value })} />}
        </div>
      ))}
    </div>
  );
}
