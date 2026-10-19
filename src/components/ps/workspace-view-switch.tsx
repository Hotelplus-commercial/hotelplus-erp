/* R1 §9 entry 1 — PM-only segmented switch between the two existing workspaces (content unchanged). */
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMeetingMgmt } from "@/lib/orm-meeting";
import { aeDirectory } from "@/lib/ps-renewal";

export function WorkspaceViewSwitch({ current, ae, onAe }: { current: "pm" | "ae"; ae?: string; onAe?: (v: string) => void }) {
  const { role } = useMeetingMgmt();
  const navigate = useNavigate();
  if (role !== "Partner Manager") return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="workspace-switch">
      <div role="group" aria-label="มุมมอง Workspace" className="flex gap-1 rounded-lg border bg-card p-1">
        <Button size="sm" variant={current === "pm" ? "default" : "ghost"} aria-pressed={current === "pm"} onClick={() => void navigate({ to: "/workspace/$dept", params: { dept: "ps" }, search: { demo: undefined, ticket: undefined } })}>มุมทีม (PM)</Button>
        <Button size="sm" variant={current === "ae" ? "default" : "ghost"} aria-pressed={current === "ae"} onClick={() => void navigate({ to: "/ps/ae-workspace/dashboard" })}>ราย AE</Button>
      </div>
      {current === "ae" && onAe && (
        <Select value={ae ?? "all"} onValueChange={onAe}>
          <SelectTrigger aria-label="เลือก AE" className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">AE: ทั้งหมด</SelectItem>
            {aeDirectory.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
