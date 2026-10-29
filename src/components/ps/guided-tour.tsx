/* Tab R1 §6.4 / §6.7 — lightweight guided tour: dims the page, spotlights one part, step panel with
 * ย้อน · ปิด · ถัดไป (last = เสร็จ) and an n / N counter. Esc closes. Targets = [data-tour="…"] inside `root`. */
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { R1_TOUR } from "@/lib/ps-glossary";

export type TourStep = { target: string; title: string; text: string };

export function GuidedTour({ steps, open, onClose, root }: { steps: TourStep[]; open: boolean; onClose: () => void; root?: HTMLElement | null }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => { if (open) setI(0); }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const el = (root ?? document).querySelector(`[data-tour="${steps[i]?.target}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "auto" });
    const upd = () => setRect(el.getBoundingClientRect());
    upd();
    window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [open, i, steps, root]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const step = steps[i]!;
  const pad = 6;
  const below = rect ? rect.bottom + 180 < window.innerHeight : true;
  const panelTop = rect ? (below ? rect.bottom + pad + 10 : Math.max(12, rect.top - pad - 10 - 170)) : window.innerHeight / 2 - 80;
  const panelLeft = rect ? Math.min(Math.max(12, rect.left), window.innerWidth - 352) : window.innerWidth / 2 - 170;
  return createPortal(
    <div className="r1-tour" role="dialog" aria-modal="true" aria-label={step.title}>
      {rect ? (
        <div className="r1-tour-spot" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      ) : <div className="r1-tour-dim" />}
      <div className="r1-tour-panel" style={{ top: panelTop, left: panelLeft }}>
        <div className="r1-tour-count tabular-nums">{i + 1} / {steps.length}</div>
        <strong>{step.title}</strong>
        <p>{step.text}</p>
        <div className="r1-tour-actions">
          <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>{R1_TOUR.back}</button>
          <button type="button" onClick={onClose}>{R1_TOUR.close}</button>
          <button type="button" className="r1-tour-next" onClick={() => (i === steps.length - 1 ? onClose() : setI(i + 1))}>{i === steps.length - 1 ? R1_TOUR.finish : R1_TOUR.next}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
