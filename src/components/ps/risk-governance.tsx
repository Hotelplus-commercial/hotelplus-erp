import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Panel } from '@/components/crm/crm-ui';
import { useTemplateMgmt, canManageTemplates } from '@/lib/email-templates';
import { useServicing } from '@/lib/ps-servicing';
import type { RiskRules } from '@/lib/ps-dashboard-types';

export function RiskGovernance() {
  const config = useTemplateMgmt();
  const { role } = useServicing();
  const can = canManageTemplates(role);
  const [draft, setDraft] = useState<RiskRules | null>(null);
  const rules = draft ?? config.riskRules;
  const patch = (next: Partial<RiskRules>) => setDraft({ ...rules, ...next });
  return <Panel title="Account Health · กฎความเสี่ยง" subtitle={config.riskUpdated ? `อัปเดตโดย ${config.riskUpdated.by} · ${new Date(config.riskUpdated.at).toLocaleString('th-TH')}` : 'PM / System Admin'}>
    <div className="grid gap-5 sm:grid-cols-2">
      <fieldset><legend className="mb-2 text-sm font-medium">Payment Grade</legend><div className="flex flex-wrap gap-4">{['A','B','C','D'].map(g => <label key={g} className="flex items-center gap-2 text-sm"><Checkbox disabled={!can} checked={rules.grades.includes(g)} onCheckedChange={checked => patch({ grades: checked ? [...rules.grades, g] : rules.grades.filter(v => v !== g) })} />{g}</label>)}</div></fieldset>
      <label className="grid gap-2 text-sm">Monthly Meeting ต่ำกว่า (0–10)<Input type="number" min={0} max={10} step={0.1} disabled={!can} value={rules.monthlySurveyBelow} onChange={e => patch({ monthlySurveyBelow: Number(e.target.value) })} /></label>
      <label className="grid gap-2 text-sm">ยอดวางบิลต่อเดือนต่ำกว่า (฿)<Input type="number" min={0} disabled={!can} value={rules.monthlyBillingBelow} onChange={e => patch({ monthlyBillingBelow: Number(e.target.value) })} /></label>
      <label className="grid gap-2 text-sm">ยอดวางบิลต่อเดือนสูงกว่า (฿)<Input type="number" min={0} disabled={!can} value={rules.monthlyBillingAbove} onChange={e => patch({ monthlyBillingAbove: Number(e.target.value) })} /></label>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">เข้าเกณฑ์อย่างน้อยหนึ่งข้อ · ข้อมูลที่ยังไม่มีไม่ถือว่าเข้าเกณฑ์ · บทบาทจำลองสำหรับการทดสอบ</p>
    {can && <div className="mt-4 flex gap-2"><Button size="sm" disabled={!draft} onClick={() => { if (config.saveRiskRules(rules, role)) { setDraft(null); toast.success('บันทึกกฎความเสี่ยงแล้ว'); } else toast.error('ตรวจช่วงคะแนนและยอดวางบิลอีกครั้ง'); }}><Save className="size-4" />บันทึกกฎ</Button><Button variant="ghost" size="sm" disabled={!draft} onClick={() => setDraft(null)}>ยกเลิก</Button></div>}
  </Panel>;
}