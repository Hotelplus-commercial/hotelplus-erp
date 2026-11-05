/* AE has no registry Workspace; its My Day lives at AE Workspace › Dashboard. This page only points there (testing usability). */
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { DemoSwitch } from "@/components/workspace/workspace-shell";
import { onDemoSessionChange, psDemoOn } from "@/lib/demo-session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/workspace/ae")({
  head: () => ({
    meta: [
      { title: "AE Workspace — Meridia Hotel ERP" },
      { name: "description", content: "ทางลัดไปที่ My Day ของ AE (AE Workspace › Dashboard)" },
      { property: "og:title", content: "AE Workspace — Meridia Hotel ERP" },
      { property: "og:description", content: "ทางลัดไปที่ My Day ของ AE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AeWorkspaceEntry,
});

function AeWorkspaceEntry() {
  const [demo, setDemo] = useState(false);
  useEffect(() => { const r = () => setDemo(psDemoOn()); r(); return onDemoSessionChange(r); }, []);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <DemoSwitch demo={demo} />
      <h1 className="text-xl font-semibold">AE Workspace</h1>
      <p className="text-sm text-muted-foreground">งานของ AE (รวมกลุ่ม 🔌 ปิด / เปิดระบบ) อยู่ใน My Day ของหน้า AE Workspace › Dashboard</p>
      <Button asChild className="self-start"><Link to="/ps/ae-workspace/dashboard">ไปที่ My Day (AE Workspace › Dashboard) →</Link></Button>
    </div>
  );
}
