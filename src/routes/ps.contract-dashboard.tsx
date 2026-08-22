import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, FolderTree, Kpi, Panel, fmtDate, sameDay } from "@/components/crm/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { thb } from "@/lib/crm-rules";
import { useCrm } from "@/lib/crm-store";
import { contractStatusLabel, type ContractStatus } from "@/lib/crm-types";

export const Route = createFileRoute("/ps/contract-dashboard")({
  head: () => ({
    meta: [
      { title: "Contract Dashboard — PS App | Meridia Hotel ERP" },
      { name: "description", content: "ติดตามสถานะสัญญาตั้งแต่ Draft จนถึง Contract Completed" },
      { property: "og:title", content: "Contract Dashboard — PS App" },
      { property: "og:description", content: "ติดตามสถานะสัญญาและการขอออกใบแจ้งหนี้" },
    ],
  }),
  component: ContractDashboard,
});

const tone = (s: ContractStatus) =>
  s === "contract_completed"
    ? "success"
    : s === "draft"
      ? "muted"
      : s.startsWith("follow_up")
        ? "warn"
        : "info";

function ContractDashboard() {
  const { contracts, invoices, liveLinks, patchContract, requestInv } = useCrm();
  const [day, setDay] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = contracts
    .filter((c) => sameDay(c.created_at, day))
    .filter((c) =>
      `${c.contract_id} ${c.customer_snapshot.hotel_name} ${c.case_number ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );

  const count = (s: ContractStatus) => contracts.filter((c) => c.status === s).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="สัญญาทั้งหมด" value={contracts.length} />
        <Kpi label="Draft" value={count("draft")} />
        <Kpi label="รอบัญชี (Inquiry INV)" value={count("inquiry_inv")} />
        <Kpi label="Completed" value={count("contract_completed")} />
      </div>

      <Panel
        title="Contract Dashboard"
        subtitle="เลือกหลายสัญญาเพื่อรวมเป็น 1 เคสขอใบแจ้งหนี้"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาเลขสัญญา / โรงแรม"
              className="h-9 w-56"
            />
            <Button
              disabled={!selected.length}
              onClick={() => {
                const caseNo = requestInv(selected);
                setSelected([]);
                toast.success(`ส่ง Inquiry INV — เคส ${caseNo}`);
              }}
            >
              ขอใบแจ้งหนี้ ({selected.length})
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <FolderTree dates={contracts.map((c) => c.created_at)} value={day} onChange={setDay} />
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2" />
                  <th className="py-2 pr-3">เลขที่สัญญา</th>
                  <th className="py-2 pr-3">ลูกค้า / โรงแรม</th>
                  <th className="py-2 pr-3">เทมเพลต</th>
                  <th className="py-2 pr-3 text-right">มูลค่า/เดือน</th>
                  <th className="py-2 pr-3">เคส</th>
                  <th className="py-2 pr-3">สถานะ</th>
                  <th className="py-2 pr-3">LIVE Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const link = liveLinks.find((l) => l.contract_ids.includes(c.contract_id));
                  const inv = invoices.find((i) => i.contract_ids.includes(c.contract_id));
                  return (
                    <tr key={c.contract_id} className="border-b last:border-0">
                      <td className="py-2.5 pr-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-[hsl(var(--primary))]"
                          disabled={c.status !== "draft"}
                          checked={selected.includes(c.contract_id)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, c.contract_id]
                                : prev.filter((x) => x !== c.contract_id),
                            )
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold">{c.contract_id}</p>
                        <p className="text-xs text-muted-foreground">
                          จาก {c.from_quote_id} · {fmtDate(c.start_date)} · {c.duration_months} เดือน
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{c.customer_snapshot.hotel_name}</p>
                        <p className="text-xs text-muted-foreground">{c.customer_snapshot.legal_name}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {c.template_snapshot.template_id} v{c.template_snapshot.version}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{thb(c.monthly_value)}</td>
                      <td className="py-2.5 pr-3 text-xs">
                        {c.case_number ?? "—"}
                        {inv && <p className="text-muted-foreground">{inv.invoice_id}</p>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Select
                          value={c.status}
                          onValueChange={(v) => patchContract(c.contract_id, { status: v as ContractStatus })}
                        >
                          <SelectTrigger className="h-8 w-[13rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(contractStatusLabel) as ContractStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>
                                {contractStatusLabel[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Chip tone={tone(c.status)} className="mt-1">
                          {contractStatusLabel[c.status]}
                        </Chip>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">
                        {link ? (
                          <a
                            href={`/l/${link.token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary underline"
                          >
                            เปิดลิงก์
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
