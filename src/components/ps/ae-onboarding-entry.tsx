/* v5.3 · AE Workspace Zone 3 — per-hotel AE entry into the shared guided drawer (own-only). */
import { ChevronDown, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ws2StatusChip } from "@/components/ps/ws2-panel";
import { AE_STAGES, CURRENT_AE, STAGE_LABEL, currentDay, useServicing, type OnboardingCard } from "@/lib/ps-servicing";

export function AeOnboardingEntry() {
  const s = useServicing();
  const [q, setQ] = useState("");
  const [line, setLine] = useState("all");
  const [showHanded, setShowHanded] = useState(false);

  const mine = useMemo(
    () =>
      s.cards.filter(
        (c) =>
          c.assigned_ae_id === CURRENT_AE &&
          (line === "all" || c.service_line === line) &&
          c.property_name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [s.cards, q, line],
  );
  const actionable = mine.filter((c) => AE_STAGES.has(c.current_stage));
  const handed = mine.filter((c) => !AE_STAGES.has(c.current_stage));

  const openCard = (readOnly: boolean) => {
    // Zone 3 lands on menu 8's existing Pipeline; only the shared drawer advances stages.
    if (!readOnly) s.setRole("ae");
  };

  return (
    <Panel
      title="Zone 3 · 🏨 Property On-boarding — งานของฉัน"
      subtitle={`AE: ${CURRENT_AE} · ${actionable.length} โรงแรมรอดำเนินการ`}
      right={
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา" className="h-9 w-44 pl-8" />
          </div>
          <Select value={line} onValueChange={setLine}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกบริการ</SelectItem>
              <SelectItem value="ORM">ORM</SelectItem>
              <SelectItem value="MARCOM">Marcom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <ul className="divide-y rounded-lg border">
        {actionable.map((c) => (
          <Row key={c.id} card={c} filled={false} cta="ทำต่อ →" onClick={() => openCard(false)} />
        ))}
        {!actionable.length && <li className="p-4 text-center text-sm text-muted-foreground">ไม่มีโรงแรมที่รอ AE ดำเนินการ</li>}
      </ul>
      <Button variant="ghost" size="sm" className="mt-3" aria-expanded={showHanded} onClick={() => setShowHanded((v) => !v)}>
        <ChevronDown className={`size-4 transition-transform ${showHanded ? "rotate-180" : ""}`} />
        ส่งต่อแล้ว (รอ Specialist / กำลังบริการ) · {handed.length}
      </Button>
      {showHanded && (
        <ul className="mt-2 divide-y rounded-lg border">
          {handed.map((c) => (
            <Row key={c.id} card={c} filled cta="ดูสถานะ" onClick={() => openCard(true)} />
          ))}
          {!handed.length && <li className="p-4 text-center text-sm text-muted-foreground">ยังไม่มีการ์ดที่ส่งต่อ</li>}
        </ul>
      )}
    </Panel>
  );
}

function Row({ card, filled, cta, onClick }: { card: OnboardingCard; filled: boolean; cta: string; onClick: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 p-3 text-sm">
      <span className="min-w-[10rem] flex-1 font-medium">🏨 {card.property_name}</span>
      <Chip tone={card.service_line === "ORM" ? "info" : "muted"}>{card.service_line === "ORM" ? "ORM" : "Marcom"}</Chip>
      <span className="min-w-[11rem] text-muted-foreground">{filled ? "●" : "○"} {STAGE_LABEL[card.current_stage]} · Day {currentDay(card)}</span>
      <Ws2StatusChip card={card} />
      <Button asChild size="sm" variant={filled ? "ghost" : "outline"}><Link to="/ps/onboarding-process" hash={`${filled ? "z3-view" : "z3-work"}-${card.id}`} onClick={onClick}>{cta}</Link></Button>
    </li>
  );
}
