/** Level A doc keys: one crm_documents row per key (namespace = doc key, PK is namespace alone). */
export const CRM_COLLECTIONS = [
  'customers', 'invoices', 'contracts', 'products', 'reports', 'taxReceipts', 'deals', 'quotations',
  'templates', 'invRequests', 'liveLinks', 'gradeRecords', 'collectionEvents', 'billingWaiting', 'audit',
] as const;
export type CrmCollection = (typeof CRM_COLLECTIONS)[number];
export const CLOUD_DOC_KEYS = [...CRM_COLLECTIONS.map((c) => `crm:${c}` as const), 'hotels', 'ws2'] as unknown as [string, ...string[]];
