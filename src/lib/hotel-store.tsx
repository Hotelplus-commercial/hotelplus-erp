import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  activeContractIndex,
  detectStatus,
  emptyContact,
  emptyContractTerm,
  paymentScore,
  type Contact,
  type ContractTerm,
  type HotelStatus,
  type MonthlyPayStatus,
  type ServiceBlock,
  type Termination,
} from "@/lib/hotel-profile";

export type SystemInfo = {
  /** PS App owns these */
  system: string;
  hplusPays: boolean;
  /** AC App owns these */
  monthlyCost: string;
  /** year -> 12 statuses */
  payments: Record<number, MonthlyPayStatus[]>;
};

export type HotelProfile = {
  id: string;
  /* --- AC App --- */
  code: string;
  name: string;
  contractorType: string;
  overdueMonths: number;
  latePayments: number;
  mainContact: Contact;
  acSaved: boolean;
  /* --- PS App --- */
  model: "commission" | "flat" | "";
  registration: "corporate" | "personal" | "";
  rooms: string;
  terms: ContractTerm[];
  termination: Termination;
  otherContacts: Contact[];
  psSaved: boolean;
  /* --- shared --- */
  system: SystemInfo;
};

export const emptyPayments = (): MonthlyPayStatus[] =>
  Array.from({ length: 12 }, () => "na" as MonthlyPayStatus);

export function newHotel(seq: number): HotelProfile {
  return {
    id: crypto.randomUUID(),
    code: `HTL-${String(seq).padStart(4, "0")}`,
    name: "",
    contractorType: "",
    overdueMonths: 0,
    latePayments: 0,
    mainContact: emptyContact(),
    acSaved: false,
    model: "",
    registration: "",
    rooms: "",
    terms: [emptyContractTerm()],
    termination: { active: false, fee: "", reason: "" },
    otherContacts: [],
    psSaved: false,
    system: { system: "", hplusPays: false, monthlyCost: "", payments: {} },
  };
}

/* ---------------- derived helpers ---------------- */

export function contractRange(h: HotelProfile) {
  const start = h.terms[0]?.start;
  const end = h.termination.active ? h.termination.date : h.terms[h.terms.length - 1]?.end;
  return { start, end };
}

export function hotelStatus(h: HotelProfile): HotelStatus {
  return detectStatus({
    contractEnd: contractRange(h).end,
    terminated: h.termination.active,
    overdueMonths: h.overdueMonths,
  });
}

export function hotelScore(h: HotelProfile) {
  return paymentScore(h.overdueMonths, h.latePayments);
}

export function activeTermOf(h: HotelProfile) {
  const idx = activeContractIndex(h.terms);
  return { index: idx, term: idx ? h.terms[idx - 1] : h.terms[h.terms.length - 1] };
}

/** average monthly service fee billed by AC (ORM monthly fee + Marcom fee) */
export function avgMonthlyFee(h: HotelProfile) {
  const { term } = activeTermOf(h);
  return (term?.services ?? []).reduce(
    (sum, s) => sum + (Number(s.monthlyFee) || 0) + (Number(s.marcomFee) || 0),
    0,
  );
}

export function paymentsFor(h: HotelProfile, year: number): MonthlyPayStatus[] {
  return h.system.payments[year] ?? emptyPayments();
}

/** last month index (0-based) that has been paid in the given year, -1 if none */
export function paidThroughIndex(h: HotelProfile, year: number) {
  const p = paymentsFor(h, year);
  let last = -1;
  p.forEach((v, i) => {
    if (v === "paid") last = i;
  });
  return last;
}

/** first contract start date across all terms */
export function serviceStart(h: HotelProfile) {
  return h.terms.map((t) => t.start).filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0];
}

/** services of the active (or latest) term grouped by category */
export function servicesByCategory(h: HotelProfile) {
  const { term } = activeTermOf(h);
  const out: Record<"orm" | "marcom" | "production", ServiceBlock[]> = {
    orm: [],
    marcom: [],
    production: [],
  };
  (term?.services ?? []).forEach((s) => {
    if (s.category) out[s.category].push(s);
  });
  return out;
}

/** days until the contract ends (null when unknown) */
export function daysToEnd(h: HotelProfile) {
  const end = contractRange(h).end;
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

/* ---------------- persistence ---------------- */

const KEY = "meridia.hotel-profiles.v1";
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const revive = (_k: string, v: unknown) =>
  typeof v === "string" && ISO.test(v) ? new Date(v) : v;

function load(): HotelProfile[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw, revive) as HotelProfile[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

/* ---------------- context ---------------- */

type Store = {
  hotels: HotelProfile[];
  selectedId: string;
  selected: HotelProfile;
  select: (id: string) => void;
  addHotel: () => string;
  removeHotel: (id: string) => void;
  patch: (id: string, next: Partial<HotelProfile>) => void;
};

const HotelStoreContext = createContext<Store | null>(null);

export function HotelStoreProvider({ children }: { children: React.ReactNode }) {
  const [hotels, setHotels] = useState<HotelProfile[]>(() => [newHotel(1)]);
  const [selectedId, setSelectedId] = useState<string>(() => "");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = load();
    if (stored) setHotels(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(hotels));
    } catch {
      /* ignore quota errors */
    }
  }, [hotels, hydrated]);

  const current = hotels.find((h) => h.id === selectedId) ?? hotels[0]!;

  const addHotel = useCallback(() => {
    const created = newHotel(hotels.length + 1);
    setHotels((p) => [...p, created]);
    setSelectedId(created.id);
    return created.id;
  }, [hotels.length]);

  const removeHotel = useCallback((id: string) => {
    setHotels((p) => (p.length > 1 ? p.filter((h) => h.id !== id) : p));
    setSelectedId("");
  }, []);

  const patch = useCallback(
    (id: string, next: Partial<HotelProfile>) =>
      setHotels((p) => p.map((h) => (h.id === id ? { ...h, ...next } : h))),
    [],
  );

  const value = useMemo<Store>(
    () => ({
      hotels,
      selectedId: current.id,
      selected: current,
      select: setSelectedId,
      addHotel,
      removeHotel,
      patch,
    }),
    [hotels, current, addHotel, removeHotel, patch],
  );

  return <HotelStoreContext.Provider value={value}>{children}</HotelStoreContext.Provider>;
}

export function useHotelStore() {
  const ctx = useContext(HotelStoreContext);
  if (!ctx) throw new Error("useHotelStore must be used inside HotelStoreProvider");
  return ctx;
}
