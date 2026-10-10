/* Cross-App Assignment v1.0 · HR App › Members roster (browser-local prototype; role flags are simulation, not auth). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberFunction = "AE" | "ONBOARDING_SPECIALIST" | "ORM_REVENUE" | "ORM_ECOMMERCE" | "MARCOM";
export const ORM_TEAMS = ["A", "B", "C", "D", "E", "RE_ACTIVE"] as const;
export type OrmTeam = (typeof ORM_TEAMS)[number];
export type HrMember = { id: string; nickname: string; function: MemberFunction; orm_team: OrmTeam | null; active: boolean };
export const FUNCTION_LABEL: Record<MemberFunction, string> = { AE: "AE", ONBOARDING_SPECIALIST: "On-boarding Specialist", ORM_REVENUE: "ORM · Revenue", ORM_ECOMMERCE: "ORM · Ecommerce", MARCOM: "Marcom" };
export const teamLabel = (t: string | null | undefined) => (t === "RE_ACTIVE" ? "Re-active" : t ? `Team ${t}` : "");

/** Assignment role flags (§5). */
export type AssignRole = "PM" | "GRM" | "MARCOM_LEAD" | "HR_ADMIN" | "VIEWER";
export const ASSIGN_ROLE_LABEL: Record<AssignRole, string> = { PM: "PM (Alex)", GRM: "GRM", MARCOM_LEAD: "Marcom Team Lead", HR_ADMIN: "HR / Admin", VIEWER: "ผู้ชม (อ่านอย่างเดียว)" };
export type AssignType = "AE" | "SPECIALIST" | "ORM" | "MARCOM";
export const canAssign = (role: AssignRole, t: AssignType) =>
  role === "PM" || (t === "ORM" && role === "GRM") || (t === "MARCOM" && role === "MARCOM_LEAD");

const seed = (): HrMember[] => {
  const m: HrMember[] = [];
  const add = (nickname: string, fn: MemberFunction, team: OrmTeam | null = null) => m.push({ id: `hr-${m.length + 1}`, nickname, function: fn, orm_team: team, active: true });
  ["Nont", "Fern", "Boss"].forEach((n) => add(n, "AE"));
  add("Dao", "ONBOARDING_SPECIALIST");
  ["แนน", "บิว", "โบว์", "เจน"].forEach((n) => add(n, "MARCOM"));
  for (const t of ORM_TEAMS) { const k = t === "RE_ACTIVE" ? "RA" : t; add(`${k}-Rev-01`, "ORM_REVENUE", t); add(`${k}-Ecom-01`, "ORM_ECOMMERCE", t); }
  return m;
};

type Ctx = {
  members: HrMember[];
  role: AssignRole;
  setRole: (r: AssignRole) => void;
  nick: (id: string | null | undefined) => string | null;
  upsert: (m: Omit<HrMember, "id"> & { id?: string }) => { ok: boolean; error?: string };
};
const C = createContext<Ctx | null>(null);
const KEY = "meridia.hr.members.v1";

export function HrMembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<HrMember[]>(seed);
  const [role, setRole] = useState<AssignRole>("PM");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw) as { members?: HrMember[]; role?: AssignRole }; if (p.members?.length) setMembers(p.members); if (p.role) setRole(p.role); } } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify({ members, role })); }, [members, role, ready]);
  const upsert = useCallback<Ctx["upsert"]>((m) => {
    if (role !== "HR_ADMIN") return { ok: false, error: "เฉพาะ HR / Admin จัดการรายชื่อได้" };
    if (!m.nickname.trim()) return { ok: false, error: "กรุณาใส่ชื่อเล่น" };
    const isOrm = m.function === "ORM_REVENUE" || m.function === "ORM_ECOMMERCE";
    if (isOrm && !m.orm_team) return { ok: false, error: "ORM ต้องระบุทีม" };
    const row = { ...m, nickname: m.nickname.trim(), orm_team: isOrm ? m.orm_team : null };
    setMembers((p) => (m.id ? p.map((x) => (x.id === m.id ? ({ ...row, id: m.id! }) : x)) : [...p, { ...row, id: `hr-${Date.now()}` }]));
    return { ok: true };
  }, [role]);
  const value = useMemo<Ctx>(() => ({
    members, role, setRole, upsert,
    nick: (id) => { const x = members.find((mm) => mm.id === id); return x ? `${x.nickname}${x.active ? "" : " (inactive)"}` : null; },
  }), [members, role, upsert]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useHrMembers = () => { const c = useContext(C); if (!c) throw new Error("useHrMembers outside provider"); return c; };
