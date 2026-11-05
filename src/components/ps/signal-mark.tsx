/* Tab R1 §5 — the one marker used on every contract-health signal chip.
 * ▼ = ต้องระวัง · ▲ = เรื่องดี · sales-opportunity labels carry the text tag "โอกาสขาย" (no star symbol).
 * Display only: the signal's dir comes from the shared engine and never changes here. */
import { R1_HEALTH } from "@/lib/ps-glossary";
import type { SignalDir } from "@/lib/contract-tab-r1";

export function SignalMark({ dir }: { dir: SignalDir | string }) {
  if (dir === "bad") return <>{"▼ "}</>;
  if (dir === "good") return <>{"▲ "}</>;
  return <span className="r1-chip-tag">{R1_HEALTH.oppTag}</span>;
}
