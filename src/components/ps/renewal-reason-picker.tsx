/* Tab R2 §6.1 — shared non-renewal reason picker (used by the AE Workspace Mark as Done step and the
 * dashboard record / edit dialog). Bad labels of groups 1–7 from the R1 catalog; click order 1st + 2nd = หลัก,
 * 3rd = รอง; click again removes; others disabled at 3. */
import { SIGNAL_GROUPS } from "@/lib/contract-tab-r1";
import { REASON_LABELS, pickToggle, reasonLabel } from "@/lib/renewal-r2";
import { RN2 } from "@/lib/ps-glossary";
import { cn } from "@/lib/utils";

const GROUPS = [1, 2, 3, 4, 5, 6, 7];

export function RenewalReasonPicker({ value, onChange, note, onNote, idPrefix = "rn2" }: { value: string[]; onChange: (v: string[]) => void; note: string; onNote: (s: string) => void; idPrefix?: string }) {
  const P = RN2.picker;
  const slot = (k: string | undefined, label: string, tone: "p" | "s") => (
    <div className={cn("rn2-slot", k && (tone === "p" ? "is-p" : "is-s"))}>
      <small>{label}</small><span>{k ? reasonLabel(k) : P.none}</span>
    </div>
  );
  return (
    <div className="rn2-picker" data-testid="reason-picker">
      <div className="rn2-slots">{slot(value[0], P.p1, "p")}{slot(value[1], P.p2, "p")}{slot(value[2], P.s, "s")}</div>
      <div className="rn2-picker-groups">
        {GROUPS.map((g) => (
          <div key={g} className="rn2-picker-group">
            <p>{g}. {SIGNAL_GROUPS[g]}</p>
            <div className="r1-chips">
              {REASON_LABELS.filter((e) => e.group === g).map((e) => {
                const at = value.indexOf(e.key);
                const full = value.length >= 3 && at < 0;
                return (
                  <button key={e.key} type="button" disabled={full} aria-pressed={at >= 0}
                    className={cn("rn2-pick", at === 0 || at === 1 ? "is-p" : at === 2 ? "is-s" : "", full && "is-disabled")}
                    onClick={() => onChange(pickToggle(value, e.key))}>
                    {at >= 0 && <b>{at < 2 ? P.tagP(at + 1) : P.tagS}</b>}{e.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <label className="rn2-note" htmlFor={`${idPrefix}-note`}>
        <span>{P.note}</span>
        <textarea id={`${idPrefix}-note`} rows={2} value={note} onChange={(e) => onNote(e.target.value)} />
      </label>
      <p className={cn("rn2-pick-hint", value.length === 3 && "is-full")}>{value.length === 3 ? P.full : P.more(3 - value.length)}</p>
    </div>
  );
}
