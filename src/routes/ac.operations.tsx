import { createFileRoute } from '@tanstack/react-router';
import { AcOperations } from '@/components/hotel/ac-operations';

export const Route = createFileRoute('/ac/operations')({
  head: () => ({ meta: [
    { title: 'AC Operations — Billing Ledger | Meridia Hotel ERP' },
    { name: 'description', content: 'งานบัญชีเรียกเก็บเงิน ยืนยันรับชำระ เกรดลูกค้า และติดตามยอดค้างของ ORM และ Marcom' },
    { property: 'og:title', content: 'AC Operations — Meridia Billing Ledger' },
    { property: 'og:description', content: 'Accounting subscriptions, invoice settlement, customer payment grades and collections.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AcOperations,
});