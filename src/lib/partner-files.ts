/* PM Workspace Partner v1.2 §4.3 (PW28) — uploaded Partner document bytes.
 * Live: browser IndexedDB database `meridia-partner-files` (store `files`, key = file_ref). DEMO: memory only.
 * Bytes are NEVER sent to Cloud; only the attachment metadata goes to the `partners` collection + its Cloud mirror. */

export const PARTNER_FILE_DB = 'meridia-partner-files';
export const PARTNER_FILE_MAX_BYTES = 20 * 1024 * 1024;
export const PARTNER_FILE_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'eml', 'msg'] as const;
export const PARTNER_FILE_HINT = 'PDF · Word · Excel · รูปภาพ · อีเมล (.eml) · ไม่เกิน 20 MB ต่อไฟล์';

/** Thai error for one rejected file, or null when allowed. */
export function partnerFileError(f: { name: string; size: number }): string | null {
  const ext = f.name.toLowerCase().split('.').pop() ?? '';
  if (!f.name.includes('.') || !(PARTNER_FILE_EXT as readonly string[]).includes(ext)) return `${f.name}: ไม่รองรับไฟล์ประเภทนี้ (รับ ${PARTNER_FILE_HINT.split(' · ไม่เกิน')[0]})`;
  if (f.size > PARTNER_FILE_MAX_BYTES) return `${f.name}: ไฟล์ใหญ่เกิน 20 MB`;
  if (f.size <= 0) return `${f.name}: ไฟล์ว่าง`;
  return null;
}

const mem = new Map<string, Blob>();
let memOnly = false;
/** DEMO (or tests) keep bytes in memory only. */
export const setPartnerFilesMemoryOnly = (on: boolean) => { memOnly = on; };

function db(): Promise<IDBDatabase> | null {
  if (memOnly || typeof indexedDB === 'undefined') return null;
  return new Promise((res, rej) => {
    const r = indexedDB.open(PARTNER_FILE_DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('files'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  const p = db(); if (!p) return undefined;
  try {
    const d = await p;
    return await new Promise<T>((res, rej) => { const q = fn(d.transaction('files', mode).objectStore('files')); q.onsuccess = () => res(q.result as T); q.onerror = () => rej(q.error); });
  } catch { return undefined; }
}

export async function putPartnerFile(ref: string, blob: Blob): Promise<void> {
  mem.set(ref, blob);
  await tx('readwrite', (s) => s.put(blob, ref));
}
export async function getPartnerFile(ref: string): Promise<Blob | null> {
  const m = mem.get(ref); if (m) return m;
  if (ref.startsWith('DEMO-')) return new Blob(['ไฟล์ตัวอย่าง (ข้อมูลสาธิต)'], { type: 'text/plain' });
  return (await tx<Blob>('readonly', (s) => s.get(ref))) ?? null;
}
export async function deletePartnerFile(ref: string): Promise<void> {
  mem.delete(ref);
  await tx('readwrite', (s) => s.delete(ref));
}
export const hasPartnerFileInMemory = (ref: string) => mem.has(ref);

/** Open a PENDING (local) file in a new tab. */
export async function openPartnerFile(ref: string): Promise<boolean> {
  const b = await getPartnerFile(ref); if (!b || typeof window === 'undefined') return false;
  const url = URL.createObjectURL(b); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
