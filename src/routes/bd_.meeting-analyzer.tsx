import { createFileRoute } from "@tanstack/react-router";
import { MeetingAnalyzerPage } from "@/components/bd/meeting-analyzer-page";

/* Patch A SP9: BD APP › ผลงานของฉัน › Pitching › Meeting Analyzer (IMG-7, sample data). */
export const Route = createFileRoute("/bd_/meeting-analyzer")({
  head: () => ({
    meta: [
      { title: "Meeting Analyzer — BD APP | Meridia Suite" },
      { name: "description", content: "ภาพรวมคะแนนการประชุมของทีม BD: หัวข้อ S1–S8, Talk Ratio, Flag ต้อง coaching" },
      { property: "og:title", content: "Meeting Analyzer — BD APP" },
      { property: "og:description", content: "ภาพรวมคะแนนการประชุมของทีม BD: หัวข้อ S1–S8, Talk Ratio, Flag ต้อง coaching" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeetingAnalyzerPage,
});
