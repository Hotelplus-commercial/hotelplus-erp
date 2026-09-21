import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { Input } from "@/components/ui/input";
import { AUTO_FIELDS, fieldGroupLabel } from "@/lib/ps-templates";

export const Route = createFileRoute("/ps/templates/auto-fields")({
  head: () => ({
    meta: [
      { title: "Auto-field reference | PS Templates" },
      { name: "description", content: "รายการ placeholder ทั้งหมดที่ใช้ได้ในเทมเพลตใบเสนอราคาและสัญญา" },
      { property: "og:title", content: "Auto-field reference | PS Templates" },
      { property: "og:description", content: "รายการ placeholder ทั้งหมดที่ใช้ได้ในเทมเพลตใบเสนอราคาและสัญญา" },
    ],
  }),
  component: AutoFieldsPage,
});

function AutoFieldsPage() {
  const [q, setQ] = useState("");
  const rows = AUTO_FIELDS.filter((f) =>
    `${f.field_path} ${f.source} ${f.example}`.toLowerCase().includes(q.toLowerCase()),
  );
  const groups = [...new Set(rows.map((r) => r.group))];

  return (
    <div className="space-y-5">
      <Link to="/ps/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> กลับไปหน้า Templates
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Auto-field reference</h1>
        <p className="text-sm text-muted-foreground">
          ใช้รูปแบบ <code className="rounded bg-muted px-1 font-mono text-xs">{"{{field.path | filter}}"}</code> ·
          ลูปใช้ <code className="rounded bg-muted px-1 font-mono text-xs">{'<foreach items="…" as="…">'}</code> พร้อมตัวแปร{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">{"{{loop.index}}"}</code>
        </p>
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา field…" className="h-9 max-w-sm" />

      {groups.map((g) => (
        <Panel key={g} title={fieldGroupLabel[g] ?? g}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Field path</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">ใช้ได้ใน</th>
                  <th className="py-2 pr-3">Filters</th>
                  <th className="py-2">ตัวอย่าง</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <tr key={r.field_path} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3">
                        <code className="font-mono text-xs">{`{{${r.field_path}}}`}</code>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{r.source}</td>
                      <td className="py-2 pr-3 text-xs">{r.type}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          {r.available_in.map((a) => (
                            <Chip key={a} tone={a === "quote" ? "info" : "muted"}>
                              {a}
                            </Chip>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {r.supported_filters.length ? r.supported_filters.join(", ") : "—"}
                      </td>
                      <td className="py-2 text-xs">{r.example}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </div>
  );
}
