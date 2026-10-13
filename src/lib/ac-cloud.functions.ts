import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { CLOUD_DOC_KEYS } from './cloud-sync-keys';

/*
 * Cloud Sync Level A — push-only mirror. These functions never return payloads,
 * so data-entry apps cannot pull cloud data back. Test-mode only: no auth (C6).
 * Close before production (Level B adds auth + RLS).
 */
const docKey = z.enum(CLOUD_DOC_KEYS);

export const readCloudRevisions = createServerFn({ method: 'POST' })
  .inputValidator((v) => z.array(docKey).max(CLOUD_DOC_KEYS.length).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('crm_documents').select('namespace,revision,updated_at').in('namespace', data);
    if (result.error) throw new Error('อ่านสถานะ Cloud ไม่สำเร็จ');
    return result.data.map((r) => ({ key: r.namespace, revision: Number(r.revision), updated_at: r.updated_at }));
  });

const pushSchema = z.object({
  key: docKey,
  revision: z.number().int().nonnegative(),
  force: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
});

export const pushCloudDoc = createServerFn({ method: 'POST' })
  .inputValidator((v) => pushSchema.parse(v))
  .handler(async ({ data }) => {
    if (JSON.stringify(data.payload).length > 8_000_000) throw new Error('ข้อมูลเกินขนาดที่รองรับ');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.force) {
      const r = await supabaseAdmin.rpc('crm_force_push', { p_namespace: data.key, p_payload: data.payload as Json });
      if (r.error) throw new Error('Force push ไม่สำเร็จ');
      return { ok: true as const, revision: Number(r.data) };
    }
    const r = await supabaseAdmin.rpc('crm_compare_swap', { p_namespace: data.key, p_revision: data.revision, p_payload: data.payload as Json });
    if (!r.error) return { ok: true as const, revision: Number(r.data) };
    const cur = await supabaseAdmin.from('crm_documents').select('revision').eq('namespace', data.key).maybeSingle();
    if (cur.error) throw new Error('บันทึก Cloud ไม่สำเร็จ');
    return { ok: false as const, cloudRevision: cur.data ? Number(cur.data.revision) : 0 };
  });

