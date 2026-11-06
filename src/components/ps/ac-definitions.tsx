/* UAT polish UP7 — the debt tab definitions (formerly the top strip), one copy, used by the ⓘ of cards ① ② ③
 * and by the (unmounted) DefinitionStrip in ac-tab.tsx. Text word-for-word from the old strip. */
import { GRADE_META, COLLECTION_META } from "@/lib/ac-revenue";
import { cn } from "@/lib/utils";

export const DEF_UNIT_GRADE = "หน่วยนับ: เกรดและ collection นับราย customer (1 customer อาจมีหลายโรงแรม)";
export const DEF_UNIT_COST = "ค่าใช้จ่ายรายสัญญา นับรายสัญญาบริการ";
export const DEF_READONLY = "ทั้ง tab อ่านอย่างเดียว คลิกชื่อเปิด AC App";

export function GradeDefs() {
  return (
    <span className="ac-def-row" data-testid="def-grade">
      {(["A", "B", "C", "D"] as const).map((g) => (
        <span key={g} className={cn("ac-pill", GRADE_META[g]!.pill)}><b>{g}</b> {GRADE_META[g]!.desc}</span>
      ))}
      <span className="ac-def-note">· คิดเฉพาะบิลรายเดือน (RECURRING) · คำนวณที่ AC App</span>
    </span>
  );
}

export function CollectionDefs() {
  return (
    <span className="ac-def-row" data-testid="def-collection">
      {(["OVERDUE", "SUSPENDED", "LEGAL", "WRITTEN_OFF"] as const).map((s, i) => (
        <span key={s} className="ac-def-chain">
          {i > 0 && <span className="text-muted-foreground">›</span>}
          <span className={cn("ac-pill", COLLECTION_META[s].pill)}>
            {COLLECTION_META[s].label}
            {s === "OVERDUE" && " · เกรด C"}
            {s === "SUSPENDED" && " · เกรด D"}
          </span>
        </span>
      ))}
      <span className="ac-def-note">· พักบริการ (PAUSED) ไม่ใช่ลูกหนี้ · แยกกล่อง</span>
    </span>
  );
}
