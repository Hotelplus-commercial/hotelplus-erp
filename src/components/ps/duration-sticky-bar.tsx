/* PS App v2.3 · Fix 4 (D-29 · D-30) — the only editable field on the preview step. */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DurationTarget = { id: string; label: string };

export function DurationStickyBar({
  contracts,
  values,
  onChange,
}: {
  contracts: DurationTarget[];
  values: Record<string, number>;
  onChange: (id: string, months: number) => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/95 px-3 py-2 backdrop-blur print:hidden">
      <span className="text-xs font-semibold">ระยะเวลาสัญญา:</span>
      {contracts.map((c, i) => (
        <label key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
          Contract {i + 1} ({c.label})
          <Select value={String(values[c.id] ?? 12)} onValueChange={(v) => onChange(c.id, Number(v))}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 12, 24].map((m) => (
                <SelectItem key={m} value={String(m)} className="text-xs">
                  {m} เดือน
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      ))}
    </div>
  );
}
