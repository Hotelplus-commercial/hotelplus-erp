import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/erp-ui";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { modules } from "@/lib/erp-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configuration | Meridia Hotel ERP" },
      {
        name: "description",
        content:
          "Configure module access, alert routing and notification preferences for the Meridia hotel management ERP.",
      },
      { property: "og:title", content: "Configuration | Meridia Hotel ERP" },
      {
        property: "og:description",
        content: "Configure module access, alert routing and notification preferences.",
      },
    ],
  }),
  component: Settings,
});

const prefs = [
  { label: "Critical operational alerts", detail: "Priority 1 work orders and system failures" },
  { label: "Financial thresholds", detail: "Receivables past 60 days and budget variances" },
  { label: "Reputation alerts", detail: "Reviews rated 3★ or below" },
  { label: "Weekly executive digest", detail: "Monday 07:00 portfolio summary" },
];

function Settings() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader
        eyebrow="System"
        title="Configuration"
        description="Manage module availability and how alerts reach your teams."
      />

      <section className="card-elevated p-4">
        <h2 className="text-base font-semibold">Module access</h2>
        <ul className="mt-3 divide-y">
          {modules.map((m) => (
            <li key={m.slug} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <m.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.code} App</p>
                  <p className="truncate text-xs text-muted-foreground">{m.tagline}</p>
                </div>
              </div>
              <Switch defaultChecked />
            </li>
          ))}
        </ul>
      </section>

      <section className="card-elevated p-4">
        <h2 className="text-base font-semibold">Notification preferences</h2>
        <Separator className="my-3" />
        <ul className="space-y-4">
          {prefs.map((p) => (
            <li key={p.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">{p.detail}</p>
              </div>
              <Switch defaultChecked />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
