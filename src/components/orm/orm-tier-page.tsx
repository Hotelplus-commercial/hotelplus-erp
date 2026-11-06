import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Eye, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/crm/crm-ui";
import { PageHeader } from "@/components/erp-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bonusHistory,
  bonusLastRun,
  bonusMonths,
  bonusRows,
  bonusTierDot,
  thb,
} from "@/lib/ps-v4";

const description =
  "จัด Tier ตาม % Revenue Achievement ของเดือนที่ปิดยอดแล้ว — รันอัตโนมัติทุกวันที่ 3 หรือรันเองแบบ Preview/Commit";

export const Route = createFileRoute("/the-office-app/orm-bonus")({
  head: () => ({
    meta: [
      { title: "ORM Bonus — Tier Classification | The Office APP" },
      { name: "description", content: description },
      { property: "og:title", content: "ORM Bonus — Tier Classification" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrmBonusPage,
});

function OrmBonusPage() {
  const [month, setMonth] = useState(bonusMonths[0]!);
  const [runOpen, setRunOpen] = useState(false);
  const [mode, setMode] = useState("preview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const changed = useMemo(() => bonusRows.filter((r) => r.oldTier !== r.tier), []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="THE OFFICE APP · ORM BONUS"
        title="ORM Bonus — Tier Classification"
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bonusMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setRunOpen(true)}>
              <RefreshCw className="size-4" /> Run Classification
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" /> Preview Only
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <Calendar className="size-4" /> View History
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border bg-muted/40 p-3 text-sm">
        Last run: {bonusLastRun.at} ({bonusLastRun.mode}) · {bonusLastRun.count} hotels classified
      </div>

      <Panel title={`Tier Classification — ${month}`} subtitle={`${bonusRows.length} โรงแรม`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel ID</TableHead>
                <TableHead>Hotel Name</TableHead>
                <TableHead>Month (closed)</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Portfolio Target</TableHead>
                <TableHead className="text-right">% Achievement</TableHead>
                <TableHead>Tier (auto)</TableHead>
                <TableHead>Stamped At</TableHead>
                <TableHead>ORM Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonusRows.map((r) => (
                <TableRow key={r.hotelId}>
                  <TableCell className="font-medium">{r.hotelId}</TableCell>
                  <TableCell>{r.hotel}</TableCell>
                  <TableCell>{r.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{thb(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{thb(r.target)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.achievement}%</TableCell>
                  <TableCell>
                    <Chip tone={r.tier === "A" ? "danger" : r.tier === "B" ? "warn" : "success"}>
                      {bonusTierDot[r.tier]} Tier {r.tier}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.stampedAt}</TableCell>
                  <TableCell>{r.ormOwner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Tier Classification</DialogTitle>
            <DialogDescription>เลือกเดือนและโหมดการรัน</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs">Month to classify</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bonusMonths.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RadioGroup value={mode} onValueChange={setMode} className="gap-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="preview" id="m-preview" />
                <Label htmlFor="m-preview" className="text-sm font-normal">
                  Preview (แสดง diff ไม่บันทึก)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="commit" id="m-commit" />
                <Label htmlFor="m-commit" className="text-sm font-normal">
                  Commit immediately
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setRunOpen(false);
                if (mode === "preview") setPreviewOpen(true);
                else toast.success(`Committed · ${bonusRows.length} hotels classified (${month})`);
              }}
            >
              Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: Tier Changes for {month}</DialogTitle>
            <DialogDescription>
              Summary: {changed.length} changed, {bonusRows.length - changed.length} unchanged
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Old Tier</TableHead>
                <TableHead>New Tier</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changed.map((r) => {
                const order = { A: 0, B: 1, C: 2 } as const;
                const up = order[r.tier] > order[r.oldTier];
                return (
                  <TableRow key={r.hotelId}>
                    <TableCell className="font-medium">{r.hotelId}</TableCell>
                    <TableCell>
                      {bonusTierDot[r.oldTier]} {r.oldTier}
                    </TableCell>
                    <TableCell>
                      {bonusTierDot[r.tier]} {r.tier}
                    </TableCell>
                    <TableCell>
                      <Chip tone={up ? "success" : "danger"}>{up ? "↑ Up" : "↓ Down"}</Chip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Discard
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                toast.success(`Committed · ${changed.length} tier changes (${month})`);
              }}
            >
              Commit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-[360px] overflow-y-auto sm:max-w-none">
          <SheetHeader>
            <SheetTitle>Classification History</SheetTitle>
            <SheetDescription>ประวัติการรันจัด Tier</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 flex flex-col gap-3 px-4 pb-6">
            {bonusHistory.map((h) => (
              <li key={h.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{h.at}</p>
                  <Chip tone={h.mode === "AUTO" ? "info" : "warn"}>{h.mode}</Chip>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {h.count} hotels classified · {h.period}
                </p>
                <p className="text-xs text-muted-foreground">Committed by: {h.by}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => toast.info(`เปิด snapshot ${h.period}`)}
                >
                  View snapshot →
                </Button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
