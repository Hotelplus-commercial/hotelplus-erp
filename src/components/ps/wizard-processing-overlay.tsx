/* PS App v2.3 · Fix 4 (D-21…D-23) — full-screen processing overlay between step 3 and step 4. */
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export const PROCESSING_SUB_STEPS = [
  "กำลังจับคู่ template ตาม SKU",
  "กำลัง populate contract fields",
  "กำลัง generate preview",
  "กำลัง bundle Signing Package",
] as const;

type Props = {
  onDone: () => void;
  onCancel: () => void;
  onTimeout: () => void;
  /** step duration (ms) — short in the prototype so operators aren't blocked */
  stepMs?: number;
  timeoutMs?: number;
};

export function WizardProcessingOverlay({ onDone, onCancel, onTimeout, stepMs = 900, timeoutMs = 5 * 60 * 1000 }: Props) {
  const [done, setDone] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    const timers = PROCESSING_SUB_STEPS.map((_, i) =>
      setTimeout(() => {
        setDone(i + 1);
        if (i === PROCESSING_SUB_STEPS.length - 1 && !finished.current) {
          finished.current = true;
          onDone();
        }
      }, stepMs * (i + 1)),
    );
    const to = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onTimeout();
      }
    }, timeoutMs);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(to);
    };
  }, [onDone, onTimeout, stepMs, timeoutMs]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-xl">
        <p className="text-center font-display text-base font-semibold">⏳ กำลังจัดเตรียมสัญญา</p>
        <ul className="space-y-2 text-sm">
          {PROCESSING_SUB_STEPS.map((label, i) => {
            const state = i < done ? "done" : i === done ? "run" : "wait";
            return (
              <li key={label} className="flex items-center justify-between gap-3">
                <span className={state === "wait" ? "text-muted-foreground" : ""}>{label}</span>
                <span>{state === "done" ? "✅" : state === "run" ? "⏳" : "⏸"}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-center text-xs text-muted-foreground">โดยประมาณ 2-5 นาที</p>
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
