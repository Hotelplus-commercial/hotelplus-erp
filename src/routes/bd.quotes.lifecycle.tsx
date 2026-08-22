import { createFileRoute } from "@tanstack/react-router";

import { Panel } from "@/components/crm/crm-ui";

export const Route = createFileRoute("/bd/quotes/lifecycle")({
  head: () => ({
    meta: [
      { title: "Quote Lifecycle Guide — BD App | Meridia Hotel ERP" },
      { name: "description", content: "กติกาวงจรชีวิตใบเสนอราคา: aging clock, การอนุมัติ, revision และการหมดอายุ" },
      { property: "og:title", content: "Quote Lifecycle Guide — BD App" },
      { property: "og:description", content: "กติกา aging, approve, revision ของใบเสนอราคา BD" },
    ],
  }),
  component: LifecycleGuide,
});

const AGING = [
  ["1-6 วัน", "Active"],
  ["7-14 วัน", "Follow-up"],
  ["15-29 วัน", "Aging 15-29"],
  ["30-45 วัน", "Aging 30-45"],
  ["46-60 วัน", "Aging 46-60"],
  ["61-90 วัน", "Aging 61-90"],
  ["91 วันขึ้นไป", "Expired (อัตโนมัติ · reason = aging)"],
];

function LifecycleGuide() {
  return (
    <div className="space-y-4">
      <Panel title="State machine" subtitle="นาฬิกา aging เริ่มนับจากวันที่ส่งใบเสนอราคา (sent_at)">
        <pre className="overflow-x-auto rounded-xl bg-surface/60 p-4 text-xs leading-relaxed">{`  [Not sent] --send--> [Active 1-6d] --> [Follow-up 7-14d]
                              |                 |
                              v                 v
                     [Aging 15-29d] -> [Aging 30-45d] -> [Aging 46-60d] -> [Aging 61-90d]
                              |                                                   |
                              |                                             91+ วัน (auto)
                              |                                                   v
                              +------------ approve -----------> [Approved]   [Expired]
                                                                     |
                                          sibling เดียวกัน (โรงแรม + ประเภทเดียวกัน)
                                                                     v
                                                            [Expired: superseded]`}</pre>
      </Panel>

      <Panel title="ตารางสถานะตามอายุเอกสาร">
        <table className="w-full max-w-md text-sm">
          <tbody>
            {AGING.map(([d, s]) => (
              <tr key={d} className="border-b last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{d}</td>
                <td className="py-2 font-medium">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="กติกาหลัก">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>R1 · ใบเสนอราคาสร้างจาก Calculator โดยใช้ชื่อโรงแรมเป็น free text ยังไม่มี Customer/Hotel ID</li>
          <li>R2/R3 · สถานะคำนวณจาก sent_at โดยงานประจำวัน และบังคับหมดอายุที่ 91 วัน</li>
          <li>R4 · ห้ามกดหมดอายุเอง ต้อง Approve, รอ auto-expire หรือสร้าง Revision</li>
          <li>R5 · เอกสารที่ส่งแล้วแก้ไขไม่ได้ ต้องสร้าง Revision (-R2, -R3, …)</li>
          <li>R6/R7 · Approve จะทำให้ใบเสนอราคาอื่นของ “โรงแรมเดียวกัน + ประเภทเดียวกัน” หมดอายุแบบ superseded</li>
          <li>R8 · 1 ดีลผูกได้หลายใบเสนอราคา (ORM + Marcom)</li>
          <li>R10 · ใบเสนอราคาที่หมดอายุแล้วผูกเข้าดีลไม่ได้</li>
        </ul>
      </Panel>
    </div>
  );
}
