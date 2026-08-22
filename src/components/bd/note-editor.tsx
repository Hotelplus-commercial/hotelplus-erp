import { Save, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/crm/crm-ui";
import { cn } from "@/lib/utils";

const TARGETS = ["PS", "AC"] as const;
export type MentionTarget = (typeof TARGETS)[number];

export function NoteEditor({
  value,
  updatedAt,
  updatedBy,
  onSave,
}: {
  value: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  onSave: (html: string, mentions: MentionTarget[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ query: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mentionCount, setMentionCount] = useState(0);

  useEffect(() => {
    if (ref.current && !dirty) ref.current.innerHTML = value ?? "";
    setMentionCount(ref.current?.querySelectorAll(".bd-mention").length ?? 0);
  }, [value, dirty]);

  const options = menu ? TARGETS.filter((t) => t.startsWith(menu.query.toUpperCase())) : [];

  const handleInput = () => {
    setDirty(true);
    setMentionCount(ref.current?.querySelectorAll(".bd-mention").length ?? 0);
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!sel || !node || node.nodeType !== Node.TEXT_NODE) {
      setMenu(null);
      return;
    }
    const before = (node.textContent ?? "").slice(0, sel.anchorOffset);
    const m = /@([A-Za-z]*)$/.exec(before);
    setMenu(m ? { query: m[1] ?? "" } : null);
  };

  const insertMention = (target: MentionTarget) => {
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!sel || !node || node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent ?? "";
    const offset = sel.anchorOffset;
    const m = /@([A-Za-z]*)$/.exec(text.slice(0, offset));
    if (!m) return;
    const start = offset - m[0].length;

    const textNode = node as Text;
    textNode.textContent = text.slice(0, start) + text.slice(offset);

    const pill = document.createElement("span");
    pill.className =
      "bd-mention rounded px-1.5 py-0.5 text-[12px] font-semibold bg-accent/20 text-accent-foreground";
    pill.setAttribute("contenteditable", "false");
    pill.dataset["target"] = target;
    pill.textContent = `@${target}`;

    const space = document.createTextNode("\u00A0");
    const range = document.createRange();
    range.setStart(textNode, start);
    range.collapse(true);
    range.insertNode(pill);
    pill.after(space);

    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);

    setMenu(null);
    setDirty(true);
    setMentionCount(ref.current?.querySelectorAll(".bd-mention").length ?? 0);
  };

  const save = () => {
    const el = ref.current;
    if (!el) return;
    const mentions = [...el.querySelectorAll<HTMLElement>(".bd-mention")]
      .map((n) => n.dataset["target"] as MentionTarget)
      .filter((t): t is MentionTarget => TARGETS.includes(t));
    onSave(el.innerHTML, [...new Set(mentions)]);
    setDirty(false);
  };

  return (
    <section className="card-elevated border-accent/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-base font-semibold">
            <StickyNote className="size-4 text-accent-foreground" /> Note
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">(free text · @mention ข้ามแอป)</p>
        </div>
        <Button size="sm" variant={dirty ? "default" : "outline"} className="gap-1.5" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
      </div>

      <div className="relative mt-3">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Note"
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMenu(null);
          }}
          className={cn(
            "min-h-28 w-full rounded-xl border bg-surface/60 p-3 text-sm outline-none",
            "focus:border-accent focus:ring-2 focus:ring-accent/20",
            "empty:before:text-muted-foreground empty:before:content-['เพิ่มหมายเหตุ...']",
          )}
        />
        {menu && options.length > 0 && (
          <div className="absolute left-3 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border bg-popover shadow-md">
            {options.map((t) => (
              <button
                key={t}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(t);
                }}
              >
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  @{t}
                </span>
                <span className="text-xs text-muted-foreground">{t === "PS" ? "Partner Success" : "Accounting"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        💡 พิมพ์ @PS หรือ @AC เพื่อ mention ทีมอื่น · {mentionCount} mentions
        {updatedAt ? ` · last saved ${fmtDate(updatedAt)} by ${updatedBy ?? "—"}` : " · ยังไม่เคยบันทึก"}
      </p>
    </section>
  );
}
