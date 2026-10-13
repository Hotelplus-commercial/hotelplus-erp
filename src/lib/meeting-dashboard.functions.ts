import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MEETING_VIEWS, type MeetingReport, type MeetingRow } from "./meeting-dashboard-types";

/** Only explicitly granted, empty safe reporting projections; no private document access. */
export const readMeetingDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<MeetingReport> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("อ่านรายงานประชุมไม่ได้");
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });
    const entries = await Promise.all(
      MEETING_VIEWS.map(async (view) => {
        const rows: MeetingRow[] = [];
        for (let offset = 0; ; offset += 1000) {
          const result = await client
            .from(view)
            .select("*")
            .range(offset, offset + 999);
          if (result.error) throw new Error("อ่านรายงานประชุมไม่ได้");
          const page = (result.data ?? []) as MeetingRow[];
          rows.push(...page);
          if (page.length < 1000) break;
          if (offset >= 99000) throw new Error("รายงานประชุมเกินขนาดที่รองรับ");
        }
        return [view, rows] as const;
      }),
    );
    const views = Object.fromEntries(entries) as MeetingReport["views"];
    return { views, pending: MEETING_VIEWS.filter((view) => !views[view].length) };
  },
);
