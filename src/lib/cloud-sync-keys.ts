/** Level A doc keys: one crm_documents row per key (namespace = doc key, PK is namespace alone). */
import { PARTNER_COLLECTIONS } from './debt-partner-types';
export const CRM_COLLECTIONS = [
  'customers', 'invoices', 'contracts', 'products', 'reports', 'taxReceipts', 'deals', 'quotations',
  'templates', 'invRequests', 'liveLinks', 'gradeRecords', 'collectionEvents', 'billingWaiting', 'audit',
] as const;
export type CrmCollection = (typeof CRM_COLLECTIONS)[number];
/** Debt Partner R1: one doc per Partner collection (push-only, same engine as crm:*). */
export const PARTNER_DOC_KEYS = PARTNER_COLLECTIONS.map((c) => `partner:${c}` as const);
export const CLOUD_DOC_KEYS = [...CRM_COLLECTIONS.map((c) => `crm:${c}` as const), 'hotels', 'ws2', 'tickets', 'renewalReasons', ...PARTNER_DOC_KEYS] as unknown as [string, ...string[]];
