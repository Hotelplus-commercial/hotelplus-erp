/** Presentation-only insights. Inputs are values already available to the card. */
export const STABLE_BAND = 0.1;
export const SMALL_N = 30;
export type SummaryRule =
  | "R-MAX"
  | "R-MIN"
  | "R-DELTA"
  | "R-TREND"
  | "R-SPLIT"
  | "R-SHARE"
  | "R-STABLE"
  | "R-SMALLN"
  | "R-EMPTY";
export type SummaryInput = {
  metric: string;
  values?: number[];
  previous?: number | null;
  current?: number | null;
  prevLabel?: string;
  unit?: string;
  base?: number;
  share?: { group: string; n: number; total: number }[];
  split?: { group: string; value: number }[];
  faster?: boolean;
  compare?: boolean;
  fixed?: string;
  empty?: boolean;
};
const f = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
export function summaryRules(input: SummaryInput, order: SummaryRule[]): string[] {
  const v = (input.values ?? []).filter(Number.isFinite);
  const latest = input.current ?? v.at(-1);
  if (
    input.empty ||
    (latest == null && !input.share?.length && !input.split?.length && !input.fixed)
  )
    return ["ยังไม่มีข้อมูลพอสรุป"];
  const unit = input.unit === "pp" ? " จุด" : (input.unit ?? "");
  const delta = () =>
    latest != null && input.previous != null && latest !== input.previous
      ? `${input.metric} ${latest > input.previous ? "เพิ่มขึ้น" : "ลดลง"} ${f(Math.abs(latest - input.previous))}${unit} จาก ${input.prevLabel ?? "เดือนก่อน"}`
      : null;
  const lines: string[] = input.fixed ? [input.fixed] : [];
  if (input.compare && delta()) lines.unshift(String(delta()));
  for (const rule of order) {
    let line: string | null = null;
    if (
      rule === "R-MAX" &&
      v.length > 1 &&
      latest === Math.max(...v) &&
      Math.max(...v) !== Math.min(...v)
    )
      line = `${input.metric} ${f(latest)}${unit} สูงสุดในรอบ ${v.length} เดือน`;
    if (
      rule === "R-MIN" &&
      v.length > 1 &&
      latest === Math.min(...v) &&
      Math.max(...v) !== Math.min(...v)
    )
      line = `${input.metric} ${f(latest)}${unit} ต่ำสุดในรอบ ${v.length} เดือน`;
    if (rule === "R-DELTA") line = delta();
    if (rule === "R-TREND" && v.length >= 3) {
      const last = v.at(-1),
        previous = v.at(-2);
      if (last != null && previous != null && last !== previous) {
        const sign = Math.sign(last - previous);
        let k = 1;
        for (let i = v.length - 1; i > 0; i--) {
          const a = v[i],
            b = v[i - 1];
          if (a == null || b == null || Math.sign(a - b) !== sign) break;
          k++;
        }
        if (k >= 3)
          line = `${input.metric} ${sign > 0 ? "เพิ่มขึ้น" : "ลดลง"}ต่อเนื่อง ${k} เดือน (${f(v[v.length - k] ?? 0)} → ${f(last)})`;
      }
    }
    if (rule === "R-SPLIT" && (input.split?.length ?? 0) >= 2) {
      const sorted = [...(input.split ?? [])].sort((a, b) => a.value - b.value);
      const low = sorted[0],
        high = sorted.at(-1);
      if (low && high && low.value !== high.value)
        line = input.faster
          ? `${low.group} เร็วกว่า ${high.group} ${f(high.value - low.value)}${unit}`
          : `${high.group} สูงกว่า ${low.group} ${f(high.value - low.value)}${unit}`;
    }
    if (rule === "R-SHARE") {
      const share = input.share?.find((s) => s.total > 0 && s.n > 0);
      if (share)
        line = `${share.group} ${f(share.n)} จาก ${f(share.total)} (${f((share.n / share.total) * 100)}%)`;
    }
    if (rule === "R-STABLE" && v.length > 1) {
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      if (v.every((x) => Math.abs(x - mean) <= Math.abs(mean) * STABLE_BAND))
        line = `${input.metric} ทรงตัวราว ${f(latest ?? mean)}${unit}`;
    }
    if (rule === "R-SMALLN" && input.base != null && input.base > 0 && input.base < SMALL_N)
      line = `ฐานเล็ก: 1 รายการ ≈ ${f(100 / input.base)}pp ให้ดูจำนวนจริงประกอบ`;
    if (line && !lines.includes(line) && lines.length < 2) lines.push(line);
  }
  // Small bases always receive the explicit count caution, without exceeding two lines.
  if (order.includes("R-SMALLN") && input.base != null && input.base > 0 && input.base < SMALL_N) {
    const caution = `ฐานเล็ก: 1 รายการ ≈ ${f(100 / input.base)}pp ให้ดูจำนวนจริงประกอบ`;
    if (!lines.includes(caution)) {
      if (lines.length === 2) lines.pop();
      lines.push(caution);
    }
  }
  return lines.length ? lines.slice(0, 2) : ["ยังไม่มีข้อมูลพอสรุป"];
}
