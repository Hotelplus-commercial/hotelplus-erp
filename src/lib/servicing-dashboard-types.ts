/* PS Dashboard · Servicing tab v1.0 — pure selectors over v_servicing_* rows (no writes, no new fields). */
import type { GlobalFilter } from "./ps-dashboard-global";

export const SERVICING_VIEWS = ["v_servicing_stage_cards", "v_servicing_stat", "v_servicing_pipeline", "v_servicing_golive_days", "v_servicing_assignment_gaps"] as const;
export type ServicingView = (typeof SERVICING_VIEWS)[number];

export type ServicingRow = {
  card_id: string; hotel_id: string; hotel_name: string;
  service_line: "ORM" | "MARCOM" | null; service_variant: string | null; orm_lite?: boolean | null;
  current_stage: string; stage_entered_at: string | null; created_at: string; go_live_at: string | null;
  progress_done: number; progress_total: number; last_updated: string | null;
  ae_owner_id: string | null; specialist_id: string | null; orm_team: string | null; marcom_owner_id: string | null;
  hotel_status?: string | null;
};
export type ServicingReport = { rows: ServicingRow[]; pending: boolean; demo?: boolean };

export type CaretakerSlot = "AE" | "SPECIALIST" | "ORM" | "MARCOM";
export const GO_LIVE = new Set(["orm_go_live", "marcom_go_live", "go_live"]);
const AE_STAGES = new Set(["new_property", "introduction_sent_form", "collect_data", "property_pending", "final_check"]);

/** Required caretakers per service_line (ORM: AE+Spec+ORM team · Marcom: AE+Spec+Marcom person). */
export function missingCaretakers(r: ServicingRow): CaretakerSlot[] {
  const out: CaretakerSlot[] = [];
  if (!r.ae_owner_id) out.push("AE");
  if (!r.specialist_id) out.push("SPECIALIST");
  if (r.service_line === "ORM" && !r.orm_team) out.push("ORM");
  if (r.service_line === "MARCOM" && !r.marcom_owner_id) out.push("MARCOM");
  return out;
}
export const assignmentComplete = (r: ServicingRow) => missingCaretakers(r).length === 0;

/** Current-stage owner (logic, not per-card). null = unknown → never matches a Team/Person lens. */
export function currentOwner(r: ServicingRow): { role: "AE" | "SPECIALIST" | "ORM" | "Marcom"; id: string | null } {
  const s = r.current_stage;
  if (AE_STAGES.has(s)) return { role: "AE", id: r.ae_owner_id };
  if (s === "approved" || s === "completed" || s === "completed_handover") return { role: "SPECIALIST", id: r.specialist_id };
  if (r.service_line === "MARCOM" || s.startsWith("marcom_")) return { role: "Marcom", id: r.marcom_owner_id };
  return { role: "ORM", id: r.orm_team };
}

export function servicingScope(rows: ServicingRow[], f: GlobalFilter) {
  const term = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.service !== "ALL" && r.service_line !== (f.service === "Marcom" ? "MARCOM" : "ORM")) return false;
    if (term && !`${r.hotel_name} ${r.hotel_id}`.toLowerCase().includes(term)) return false;
    if (f.hotelStatus !== "all" && r.hotel_status != null) {
      const want = f.hotelStatus === "active" ? "ACTIVE" : f.hotelStatus === "contract-end" ? "INACTIVE" : f.hotelStatus.toUpperCase();
      if (String(r.hotel_status).toUpperCase() !== want) return false;
    }
    const lens = f.role !== "none" || f.teams.length || f.people.length;
    if (!lens) return true;
    const o = currentOwner(r);
    if (!o.id) return false;
    if (f.role !== "none" && o.role !== f.role) return false;
    const vals = [o.id, ...(f.ownerAliases?.[o.id] ?? [])];
    if (f.teams.length && !f.teams.some((t) => vals.includes(t))) return false;
    if (f.people.length && !f.people.some((p) => vals.includes(p))) return false;
    return true;
  });
}

export function servicingStats(rows: ServicingRow[]) {
  const goLive = rows.filter((r) => GO_LIVE.has(r.current_stage)).length;
  return { cards: rows.length, hotels: new Set(rows.map((r) => r.hotel_id)).size, goLive, inProgress: rows.length - goLive, awaiting: rows.filter((r) => !assignmentComplete(r)).length };
}

/** Normalises a row's stage into a lane column; First Sync counts MT only (GMB skips it). */
export function laneStage(r: ServicingRow, lane: string[]) {
  if (r.current_stage === "go_live") return lane[lane.length - 1] ?? r.current_stage;
  if (r.current_stage === "marcom_first_sync" && r.service_variant === "MARCOM_GMB") return null;
  return r.current_stage;
}

export const daysFrom = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);
export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const p = (s.length - 1) / 2;
  return ((s[Math.floor(p)] ?? 0) + (s[Math.ceil(p)] ?? 0)) / 2;
}
