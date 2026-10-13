import { useSyncExternalStore } from 'react';
import { AlertTriangle, CloudUpload, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { flush, forcePush, getCloudSyncServerSnapshot, getCloudSyncSnapshot, keepCloud, subscribeCloudSync } from '@/lib/cloud-sync';

const LABEL = { idle: 'Cloud ล่าสุด', pending: 'รอ sync', syncing: 'กำลัง sync', error: 'Sync ผิดพลาด' } as const;

export function CloudSyncControl() {
  const s = useSyncExternalStore(subscribeCloudSync, getCloudSyncSnapshot, getCloudSyncServerSnapshot);
  const conflict = s.conflicts.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={conflict ? 'destructive' : 'outline'} size="sm" className="gap-1.5" aria-label="Cloud sync">
          {conflict ? <AlertTriangle className="size-4" /> : <CloudUpload className="size-4" />}
          <span className="hidden sm:inline">{conflict ? `ข้อมูลชนกัน ${s.conflicts.length}` : LABEL[s.phase]}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-sm">
        <div>
          <p className="font-medium">Cloud Sync (ทดสอบ · ส่งทางเดียว)</p>
          <p className="text-xs text-muted-foreground">
            บันทึกในเครื่องนี้แล้วส่งขึ้น Cloud ให้ Dashboard อ่าน · ไม่ดึงข้อมูล Cloud กลับมาแก้ · ไม่มีระบบล็อกอิน ห้ามใช้กับข้อมูลจริง
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.lastSyncedAt ? `ส่งล่าสุด ${new Date(s.lastSyncedAt).toLocaleTimeString('th-TH')}` : 'ยังไม่ได้ส่ง'} · {s.docs} ชุดข้อมูล
          </p>
          {s.error && <p className="mt-1 text-xs text-destructive">{s.error}</p>}
        </div>
        {s.conflicts.map((c) => (
          <div key={c.key} className="space-y-2 rounded-md border border-destructive/40 p-2">
            <p className="text-xs">
              <span className="font-mono">{c.key}</span> ถูกแก้จากที่อื่น (Cloud รุ่น {c.cloudRevision} · เครื่องนี้เห็นรุ่น {c.localRevision}) — ยังไม่ได้ทับ
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => keepCloud(c.key)}>ใช้ของ Cloud (ไม่ทับ)</Button>
              <Button size="sm" variant="destructive" onClick={() => void forcePush(c.key)}>Force push ทับ</Button>
            </div>
          </div>
        ))}
        <Button size="sm" className="w-full gap-1.5" disabled={s.phase === 'syncing'} onClick={() => void flush(true)}>
          <RefreshCw className="size-4" /> Sync now
        </Button>
      </PopoverContent>
    </Popover>
  );
}
