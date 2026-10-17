import { useEffect, useState, useRef, type ReactNode, type ReactElement } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DashTone = "accent" | "good" | "watch" | "action" | "neutral" | "onboard";
export const toneClass: Record<DashTone, string> = {
  accent: "text-primary",
  good: "text-dash-good",
  watch: "text-dash-watch",
  action: "text-dash-action",
  neutral: "text-muted-foreground",
  onboard: "text-series-2",
};
export function SummaryNote({
  noteKey,
  noteLines,
  howToRead,
  tone = "accent",
  title,
  children,
}: {
  noteKey: string;
  noteLines: string[];
  howToRead?: string;
  tone?: DashTone;
  title?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(`psdash.note.${noteKey}`) === "1");
    } catch {
      setOpen(false);
    }
  }, [noteKey]);
  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`psdash.note.${noteKey}`, next ? "1" : "0");
    } catch {
      /* Storage is optional. */
    }
  }
  return (
    <div className="dash-summary">
      <Button
        variant="ghost"
        className="dash-note-toggle"
        aria-expanded={open}
        aria-controls={`note-${noteKey}`}
        onClick={toggle}
      >
        <ChevronRight className={cn("transition-transform", open && "rotate-90")} />
        {title ?? (open ? "ซ่อนสรุป" : "ดูสรุปสั้น")}
      </Button>
      {open && (
        <div
          id={`note-${noteKey}`}
          className={cn(
            "dash-note-panel",
            tone === "watch" && "dash-note-watch",
            tone === "onboard" && "dash-note-onboard",
          )}
        >
          {children ?? (
            <>
              <ul className="space-y-1">
                {noteLines.slice(0, 2).map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
              {howToRead && (
                <p className="mt-2 text-xs text-muted-foreground">อ่านอย่างไร: {howToRead}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
export function DashCard({
  title,
  question,
  answer = "—",
  answerSub,
  answerTone = "accent",
  legend,
  children,
  noteKey,
  noteLines,
  howToRead,
  right,
}: {
  title: string;
  question: string;
  answer?: ReactNode;
  answerSub?: ReactNode;
  answerTone?: DashTone;
  legend?: ReactNode;
  children: ReactNode;
  noteKey: string;
  noteLines: string[];
  howToRead: string;
  right?: ReactNode;
}) {
  return (
    <section className="dash-card">
      <header className="dash-card-header">
        <div className="min-w-0">
          <h2>{title}</h2>
          <p className="dash-question">{question}</p>
        </div>
        <div className="dash-answer-block">
          <div className={cn("dash-answer", toneClass[answerTone])}>{answer}</div>
          {answerSub && <div className="dash-answer-sub">{answerSub}</div>}
          {right}
        </div>
      </header>
      {legend && <div className="dash-legend">{legend}</div>}
      <div className="min-w-0">{children}</div>
      <SummaryNote
        noteKey={`ps.${noteKey}`}
        noteLines={noteLines}
        howToRead={howToRead}
        tone={answerTone}
      />
    </section>
  );
}
export function ChartTooltip({ header, lines = [] }: { header: ReactNode; lines?: ReactNode[] }) {
  return (
    <div className="dash-tooltip" role="tooltip">
      <strong>{header}</strong>
      {lines.slice(0, 3).map((line, i) => (
        <div className="dash-tooltip-detail" key={i}>
          {line}
        </div>
      ))}
    </div>
  );
}
/** Collision-aware shared interaction for HTML bars, legend rows and SVG points. */
export function ChartHint({
  header,
  lines,
  children,
}: {
  header: ReactNode;
  lines?: ReactNode[];
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const pointerFocus = useRef(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onPointerDown={() => {
          pointerFocus.current = true;
        }}
        onFocus={() => {
          if (!pointerFocus.current) setOpen(true);
          pointerFocus.current = false;
        }}
        onKeyDown={(e) => {
          if (
            e.currentTarget.tagName.toLowerCase() !== "button" &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            setOpen((value) => !value);
          }
        }}
        onBlur={() => setOpen(false)}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={8}
        className="dash-tooltip-popover"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <ChartTooltip header={header} lines={lines ?? []} />
      </PopoverContent>
    </Popover>
  );
}
export function ChartSkeleton({
  source = false,
  text = "รอ Cloud Sync seed",
}: {
  source?: boolean;
  text?: string;
}) {
  return (
    <div className="dash-chart-skeleton">
      <div className="dash-skeleton-axis" />
      <div className="dash-skeleton-bars">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} />
        ))}
      </div>
      <span className="dash-source-pill">{source ? "รอ source" : text}</span>
    </div>
  );
}
export function Delta({
  a,
  b,
  lowerGood = false,
  unit = "",
}: {
  a: number | null;
  b: number | null;
  lowerGood?: boolean;
  unit?: string;
}) {
  if (a == null || b == null) return <span className="text-muted-foreground">Δ —</span>;
  const d = a - b;
  return (
    <span
      className={
        d === 0 ? toneClass.neutral : d < 0 === lowerGood ? toneClass.good : toneClass.watch
      }
    >
      {d > 0 ? "▲ +" : d < 0 ? "▼ " : ""}
      {d.toLocaleString("th-TH", { maximumFractionDigits: 1 })}
      {unit}
    </span>
  );
}
