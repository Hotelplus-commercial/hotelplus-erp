/* PS App v2.2 · Fix 1 — WYSIWYG quote editor.
 * Renders the quote node list on the A4 canvas (no raw HTML source box) and lets
 * template admins add / remove / reposition nodes and configure pricing tables. */
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { renderBody } from "@/lib/contract-renderer";
import {
  FILTER_LABEL,
  QUOTE_NODE_HINT,
  QUOTE_NODE_LABEL,
  createQuoteNode,
  isAtomicQuoteNode,
  quoteNodeHtml,
  type QuoteNode,
  type QuoteNodeType,
  type QuotePricingFilter,
} from "@/lib/quote-nodes";
import type { QuoteLineItem } from "@/lib/template-preview-sample-data";
import { cn } from "@/lib/utils";

const INSERTABLE: QuoteNodeType[] = ["ci_header", "info_block", "package_card", "pricing_table", "footer", "caption"];

type Props = {
  nodes: QuoteNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (nodes: QuoteNode[]) => void;
  data: Record<string, string>;
  lineItems: QuoteLineItem[];
  raw: boolean;
};

export function QuoteNodeCanvas({ nodes, selectedId, onSelect, onChange, data, lineItems, raw }: Props) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...nodes];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[i]!;
    const b = next[j]!;
    next[i] = b;
    next[j] = a;
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {nodes.map((n, i) => (
        <div
          key={n.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(n.id)}
          onKeyDown={(e) => e.key === "Enter" && onSelect(n.id)}
          className={cn(
            "group relative rounded-[2px] outline-none ring-offset-1 transition",
            selectedId === n.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40",
          )}
        >
          <div
            className="q-doc"
            dangerouslySetInnerHTML={{
              __html: renderBody(quoteNodeHtml(n), data, { raw, pills: true, lineItems }),
            }}
          />
          <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
            <Button size="icon" variant="secondary" className="size-6" onClick={(e) => { e.stopPropagation(); move(i, -1); }}>
              <ArrowUp className="size-3" />
            </Button>
            <Button size="icon" variant="secondary" className="size-6" onClick={(e) => { e.stopPropagation(); move(i, 1); }}>
              <ArrowDown className="size-3" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                onChange(nodes.filter((x) => x.id !== n.id));
              }}
            >
              <X className="size-3" />
            </Button>
          </div>
          <span className="pointer-events-none absolute left-1 top-1 hidden rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground group-hover:block">
            {QUOTE_NODE_LABEL[n.type]}
            {isAtomicQuoteNode(n.type) ? " · atomic" : ""}
          </span>
        </div>
      ))}
      {!nodes.length && (
        <p className="p-6 text-center text-[11px] text-muted-foreground">
          ยังไม่มี node · เพิ่มจากแผง Insert ด้านขวา
        </p>
      )}
    </div>
  );
}

/** Right-panel: insert nodes + configure the selected node's props. */
export function QuoteNodePanel({
  nodes,
  selectedId,
  onChange,
  onSelect,
}: Pick<Props, "nodes" | "selectedId" | "onChange" | "onSelect">) {
  const sel = nodes.find((n) => n.id === selectedId) ?? null;

  const patch = (p: Partial<QuoteNode>) =>
    onChange(nodes.map((n) => (n.id === sel?.id ? ({ ...n, ...p } as QuoteNode) : n)));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {INSERTABLE.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              const node = createQuoteNode(t);
              onChange([...nodes, node]);
              onSelect(node.id);
            }}
            className="flex w-full items-start gap-2 rounded-lg border bg-surface px-2 py-1.5 text-left hover:border-primary"
          >
            <Plus className="mt-0.5 size-3 shrink-0 text-primary" />
            <span>
              <span className="block text-[11px] font-semibold">{QUOTE_NODE_LABEL[t]}</span>
              <span className="block text-[10px] text-muted-foreground">{QUOTE_NODE_HINT[t]}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-2">
        <p className="mb-2 text-[11px] font-semibold">
          {sel ? `ตั้งค่า · ${QUOTE_NODE_LABEL[sel.type]}` : "เลือก node บนหน้ากระดาษเพื่อตั้งค่า"}
        </p>

        {sel?.type === "pricing_table" && (
          <div className="space-y-2">
            <div>
              <Label className="text-[10px]">title</Label>
              <Input
                value={sel.title}
                onChange={(e) => patch({ title: e.target.value } as Partial<QuoteNode>)}
                className="h-8 text-[11px]"
              />
            </div>
            <div>
              <Label className="text-[10px]">filter</Label>
              <Select
                value={sel.filter}
                onValueChange={(v) => patch({ filter: v as QuotePricingFilter } as Partial<QuoteNode>)}
              >
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILTER_LABEL) as QuotePricingFilter[]).map((f) => (
                    <SelectItem key={f} value={f} className="text-[11px]">
                      {FILTER_LABEL[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">total_field</Label>
              <Select value={sel.total_field} onValueChange={(v) => patch({ total_field: v } as Partial<QuoteNode>)}>
                <SelectTrigger className="h-8 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["quote.first_month_total", "quote.recurring_total"].map((f) => (
                    <SelectItem key={f} value={f} className="text-[11px]">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={sel.show_commission}
                onChange={(e) => patch({ show_commission: e.target.checked } as Partial<QuoteNode>)}
              />
              show_commission (ORM เท่านั้น)
            </label>
          </div>
        )}

        {sel?.type === "caption" && (
          <Input
            value={sel.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<QuoteNode>)}
            className="h-8 text-[11px]"
          />
        )}

        {sel && isAtomicQuoteNode(sel.type) && sel.type !== "pricing_table" && (
          <p className="text-[10px] text-muted-foreground">
            node นี้เป็น atomic · ข้อความและโครงสร้างภายในถูกกำหนดโดย branding · แก้ไขไม่ได้ (ย้าย/ลบได้)
          </p>
        )}
      </div>
    </div>
  );
}
