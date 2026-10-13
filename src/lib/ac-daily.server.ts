/**
 * Retired: daily processing now runs manually in the browser on the split write-layer
 * (AC Billing button). The server never reads the deprecated combined `crm` document.
 */
export async function processAccountingDaily() {
  return { created: 0, skipped: true as const };
}
