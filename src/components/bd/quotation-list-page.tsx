/* Patch A SP8 — ใบเสนอราคา list, layout and sample rows copied from the real portal (IMG-6). Read-only sample data. */
import { useMemo, useState } from "react";
import { Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type QuoteRow = { no: string; hotel: string; contact: string; deal: string; by: string; date: string; status: "Draft" | "Contracted" | "Approved" | "Sent"; sentAt?: string; service: "ORM" | "Marcom" };
export const QUOTE_SAMPLE: QuoteRow[] = [
  { no: "QT261105013", hotel: "PS Sriphu Hotel", contact: "Jutasinee Luesiripong (คุณเก๋)", deal: "4023", by: "Kanokwan W.", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
  { no: "QT261105012", hotel: "PS Sriphu Hotel", contact: "Jutasinee Luesiripong (คุณเก๋)", deal: "4023", by: "Kanokwan W.", date: "5 พ.ย. 2569", status: "Draft", service: "Marcom" },
  { no: "QT261105011R01", hotel: "บัดกันมา เชียงราย", contact: "ณิชาภา รุ่งเรือง (เจ้าของ)", deal: "4026", by: "สิรกฤษ สกุลวรรธรรม", date: "5 พ.ย. 2569", status: "Contracted", service: "ORM" },
  { no: "QT261105011", hotel: "บัดกันมา เชียงราย", contact: "ณิชาภา รุ่งเรือง (เจ้าของ)", deal: "4026", by: "สิรกฤษ สกุลวรรธรรม", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
  { no: "QT261105010R01", hotel: "THE MUG Resort", contact: "Ying", deal: "4021", by: "พลอยปภัส มหารนัดถ์", date: "5 พ.ย. 2569", status: "Draft", service: "Marcom" },
  { no: "QT261105010", hotel: "THE MUG Resort", contact: "Ying", deal: "4021", by: "พลอยปภัส มหารนัดถ์", date: "5 พ.ย. 2569", status: "Draft", service: "Marcom" },
  { no: "QT261105009", hotel: "กรีนวิว เอกมัย 10 เรสซิเดนซ์", contact: "คุณเจี๊ยบ", deal: "4002", by: "พลอยปภัส มหารนัดถ์", date: "5 พ.ย. 2569", status: "Approved", service: "ORM" },
  { no: "QT261105007", hotel: "Rasta View Bungalows", contact: "เจนจิรา สุพร", deal: "4025", by: "พลอยปภัส มหารนัดถ์", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
  { no: "QT261105005", hotel: "Asaya Pool Villa", contact: "Chris Unakul", deal: "4022", by: "พัณวดี หมัดสุเด็น", date: "5 พ.ย. 2569", status: "Sent", sentAt: "5 พ.ย. 2569", service: "Marcom" },
  { no: "QT261105004", hotel: "Malisa Poolside Villas (Ao Nang, Krabi)", contact: "อภิหาร โกแก้ว (เจ้าของ)", deal: "4020", by: "Kanokwan W.", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
  { no: "QT261105003R01", hotel: "SAENDEE HOTEL AMATA CITY CHONBURI", contact: "น.ส.นิตยา โมจินดา", deal: "3885", by: "พัณวดี หมัดสุเด็น", date: "5 พ.ย. 2569", status: "Contracted", service: "ORM" },
  { no: "QT261105003", hotel: "SAENDEE HOTEL AMATA CITY CHONBURI", contact: "น.ส.นิตยา โมจินดา", deal: "3885", by: "พัณวดี หมัดสุเด็น", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
  { no: "QT261105002", hotel: "Siree Vana Pool Villa Khao Yai", contact: "คุณต่าย (เจ้าของใหม่)", deal: "3452", by: "พลอยปภัส มหารนัดถ์", date: "5 พ.ย. 2569", status: "Sent", sentAt: "5 พ.ย. 2569", service: "Marcom" },
  { no: "QT261105001", hotel: "The KN Kohlarn", contact: "สมพิศ กล่ำดิษฐ / ก้ามปู", deal: "4017", by: "มุนิน วนาจารุวัฒน์", date: "5 พ.ย. 2569", status: "Draft", service: "ORM" },
];
const TONE: Record<QuoteRow["status"], string> = {
  Draft: "bg-muted text-muted-foreground", Contracted: "border border-foreground", Approved: "bg-success/15 text-success", Sent: "bg-info/15 text-info",
};
export function filterQuotes(rows: QuoteRow[], f: { status: string; service: string; by: string; q: string }) {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => (!f.status || r.status === f.status) && (!f.service || r.service === f.service) && (!f.by || r.by === f.by)
    && (!q || [r.hotel, r.contact, r.no].some((x) => x.toLowerCase().includes(q))));
}

export function QuotationListPage() {
  const [f, setF] = useState({ status: "", service: "", by: "", q: "" });
  const rows = useMemo(() => filterQuotes(QUOTE_SAMPLE, f), [f]);
  const people = [...new Set(QUOTE_SAMPLE.map((r) => r.by))];
  const sel = (key: "status" | "service" | "by", label: string, opts: string[]) => (
    <select aria-label={label} className="h-9 w-40 rounded-md border bg-background px-2 text-sm" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}>
      <option value="">{label}</option>{opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  return (
    <div className="space-y-4" data-testid="quotation-list">
      <div><h1 className="text-2xl font-semibold">ใบเสนอราคา</h1><p className="text-sm text-muted-foreground">ทุกใบที่ export จากหน้า Calculator ถูกบันทึกไว้ที่นี่ — เปิดไฟล์ที่ส่งไปได้ และบันทึกว่าลูกค้ารับหรือไม่</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {sel("status", "สถานะ", ["Draft", "Sent", "Approved", "Contracted"])}{sel("service", "บริการ", ["ORM", "Marcom"])}{sel("by", "พนักงาน BD", people)}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="w-64 pl-8" placeholder="ค้นชื่อโรงแรม ผู้ติดต่อ หรือเลขที่ใบ" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
          <span className="rounded-md border px-2 py-1.5 text-sm" data-testid="quote-count">{rows.length} ใบ</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            {["ลำดับที่", "เลขที่ใบเสนอราคา", "โรงแรม", "ชื่อติดต่อ", "Deal ID", "ผู้ออก QT", "วันที่ออก ⌄", "สถานะ", "การจัดการ"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.no} className="border-b last:border-0">
                <td className="px-3 py-3 text-center">{i + 1}</td><td className="px-3 font-semibold">{r.no}</td><td className="px-3">{r.hotel}</td><td className="px-3">{r.contact}</td>
                <td className="px-3">{r.deal}</td><td className="max-w-[10rem] truncate px-3">{r.by}</td><td className="px-3">{r.date}</td>
                <td className="px-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TONE[r.status])}>{r.status}</span>{r.sentAt && <div className="text-[10px] text-muted-foreground">{r.sentAt}</div>}</td>
                <td className="px-3 text-center"><Menu className="inline h-4 w-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">ข้อมูลตัวอย่างจากหน้า portal เดิม (14 จาก 35 ใบที่เห็นในภาพ)</p>
    </div>
  );
}
