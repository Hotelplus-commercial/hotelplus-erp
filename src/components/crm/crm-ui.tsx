import { useMemo, useState } from "react";

import { thb } from "@/lib/crm-rules";
import type { CustomerSnapshot, Totals } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

export const appTone = {
  BD: "bg-primary/10 text-primary",
  PS: "bg-accent/15 text-accent-foreground",
  AC: "bg-success/12 text-success",
} as const;

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "info" | "success" | "warn" | "danger";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    info: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warn: "bg-warning/20 text-warning-foreground",
    danger: "bg-destructive/12 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-surface/50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card-elevated p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function TotalsBlock({ totals, whtNote }: { totals: Totals; whtNote?: string | undefined }) {
  return (
    <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
      <Row label="ยอดรวมก่อนภาษี" value={thb(totals.subtotal)} />
      <Row label="VAT 7%" value={thb(totals.vat)} />
      <Row
        label={`หัก ณ ที่จ่าย 3%${whtNote ? ` (${whtNote})` : ""}`}
        value={totals.wht ? `- ${thb(totals.wht)}` : "—"}
      />
      <div className="mt-2 flex items-center justify-between border-t pt-2">
        <span className="font-semibold">ยอดชำระสุทธิ</span>
        <span className="font-display text-lg font-bold">{thb(totals.total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function PartyBlock({ snapshot }: { snapshot: CustomerSnapshot | null }) {
  if (!snapshot)
    return (
      <p className="text-xs text-muted-foreground">
        ยังไม่ได้เลือกลูกค้า — ข้อมูลจะถูก snapshot ตอน Approve
      </p>
    );
  return (
    <div className="text-xs leading-relaxed">
      <p className="text-sm font-semibold">{snapshot.legal_name}</p>
      <p className="text-muted-foreground">{snapshot.address}</p>
      <p className="text-muted-foreground">
        เลขประจำตัวผู้เสียภาษี {snapshot.tax_id} ·{" "}
        {snapshot.type === "juristic" ? "นิติบุคคล" : "บุคคลธรรมดา"}
      </p>
      <p className="text-muted-foreground">
        โรงแรม: {snapshot.hotel_name} · {snapshot.contact_phone} · {snapshot.contact_email}
      </p>
    </div>
  );
}

/** yyyy → month → day folder tree used by quotation / contract dashboards */
export function FolderTree({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [openYear, setOpenYear] = useState<string | null>(null);
  const tree = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    dates.forEach((iso) => {
      const d = new Date(iso);
      const yy = String(d.getFullYear());
      const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const months = map.get(yy) ?? new Map<string, number>();
      months.set(md, (months.get(md) ?? 0) + 1);
      map.set(yy, months);
    });
    return map;
  }, [dates]);

  const years = [...tree.keys()].sort().reverse();
  const active = openYear ?? years[0] ?? null;

  return (
    <div className="w-full shrink-0 rounded-xl border bg-surface/40 p-3 text-sm lg:w-56">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "mb-2 w-full rounded-md px-2 py-1.5 text-left font-medium",
          !value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        ทั้งหมด ({dates.length})
      </button>
      {years.map((yy) => (
        <div key={yy}>
          <button
            onClick={() => setOpenYear(active === yy ? null : yy)}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            {yy}
          </button>
          {active === yy && (
            <div className="ml-2 border-l pl-2">
              {[...tree.get(yy)!.entries()]
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([md, count]) => {
                  const key = `${yy}-${md}`;
                  return (
                    <button
                      key={key}
                      onClick={() => onChange(value === key ? null : key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs",
                        value === key ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted",
                      )}
                    >
                      <span>{md.replace("-", "/")}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const sameDay = (iso: string, key: string | null) =>
  !key ||
  `${new Date(iso).getFullYear()}-${String(new Date(iso).getMonth() + 1).padStart(2, "0")}-${String(
    new Date(iso).getDate(),
  ).padStart(2, "0")}` === key;

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : "—";
