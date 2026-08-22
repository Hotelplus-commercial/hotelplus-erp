import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  lastPeriod,
  seedContracts,
  seedCustomers,
  seedDeals,
  seedInvRequests,
  seedInvoices,
  seedLiveLinks,
  seedProducts,
  seedQuotations,
  seedReports,
  seedTemplates,
} from "@/lib/crm-seed";
import {
  computeTotals,
  emptyTotals,
  nextCaseNumber,
  nextContractId,
  nextInvoiceId,
  nextQuoteId,
  revisionIdFor,
  snapshotCustomer,
  taxReceiptIdFor,
} from "@/lib/crm-rules";
import type {
  AuditEntry,
  Contract,
  ContractTemplate,
  Customer,
  Deal,
  Invoice,
  InvoiceLine,
  InvRequest,
  LiveLink,
  Product,
  ProductionReport,
  Quotation,
  QuoteLine,
  TaxReceipt,
} from "@/lib/crm-types";

export { lastPeriod };

const KEY = "hotelplus-crm-v1";

export type CrmUser = { email: string; name: string; app: "BD" | "PS" | "AC" };

export const crmUsers: CrmUser[] = [
  { email: "somchai.n@hotelplus.asia", name: "สมชาย (BD)", app: "BD" },
  { email: "ps.team@hotelplus.asia", name: "ปาริชาต (PS)", app: "PS" },
  { email: "ac.team@hotelplus.asia", name: "อรvija (AC)", app: "AC" },
];

type CrmData = {
  products: Product[];
  customers: Customer[];
  deals: Deal[];
  templates: ContractTemplate[];
  quotations: Quotation[];
  contracts: Contract[];
  reports: ProductionReport[];
  invRequests: InvRequest[];
  invoices: Invoice[];
  taxReceipts: TaxReceipt[];
  liveLinks: LiveLink[];
  audit: AuditEntry[];
  actor: string;
};

const initial = (): CrmData => ({
  products: seedProducts,
  customers: seedCustomers,
  deals: seedDeals,
  templates: seedTemplates,
  quotations: seedQuotations,
  contracts: seedContracts,
  reports: seedReports,
  invRequests: seedInvRequests,
  invoices: seedInvoices,
  taxReceipts: [],
  liveLinks: seedLiveLinks,
  audit: [],
  actor: crmUsers[0]!.email,
});

function load(): CrmData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrmData;
    return parsed && Array.isArray(parsed.products) ? { ...initial(), ...parsed } : null;
  } catch {
    return null;
  }
}

type Store = CrmData & {
  hydrated: boolean;
  setActor: (email: string) => void;
  reset: () => void;
  /* products */
  upsertProduct: (p: Product) => void;
  toggleProduct: (sku: string) => void;
  /* customers */
  upsertCustomer: (c: Customer) => void;
  /* deals */
  syncDeals: () => void;
  /* quotations */
  createQuote: (dealId: number, customerId: string | null) => string;
  patchQuote: (id: string, next: Partial<Quotation>) => void;
  setQuoteLines: (id: string, lines: QuoteLine[]) => void;
  approveQuote: (id: string) => void;
  reviseQuote: (id: string) => string;
  /* contracts */
  addContracts: (list: Contract[]) => void;
  patchContract: (id: string, next: Partial<Contract>) => void;
  requestInv: (contractIds: string[]) => string;
  newContractId: () => string;
  /* reports */
  addReports: (list: ProductionReport[]) => void;
  /* invoices */
  createInvoice: (caseNumber: string, lines: InvoiceLine[], period: { start: string; end: string }) => string;
  issueInvoice: (id: string) => string;
  markPaid: (invoiceId: string, method: string) => string | null;
  voidTaxReceipt: (id: string, reason: string) => void;
  /* live link */
  liveLinkByToken: (token: string) => LiveLink | undefined;
  signLiveLink: (token: string, signature: string) => void;
  payLiveLink: (token: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function CrmStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CrmData>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = load();
    if (stored) setData(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }, [data, hydrated]);

  const log = useCallback(
    (d: CrmData, action: string, target: string): AuditEntry[] => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actor: d.actor,
        action,
        target,
      },
      ...d.audit,
    ],
    [],
  );

  const value = useMemo<Store>(() => {
    const upd = (fn: (d: CrmData) => CrmData) => setData((d) => fn(d));

    return {
      ...data,
      hydrated,
      setActor: (email) => upd((d) => ({ ...d, actor: email })),
      reset: () => {
        try {
          window.localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setData(initial());
      },

      upsertProduct: (p) =>
        upd((d) => ({
          ...d,
          products: d.products.some((x) => x.product_id === p.product_id)
            ? d.products.map((x) => (x.product_id === p.product_id ? p : x))
            : [...d.products, p],
          audit: log(d, "product.save", p.sku),
        })),

      toggleProduct: (sku) =>
        upd((d) => ({
          ...d,
          products: d.products.map((p) => (p.sku === sku ? { ...p, active: !p.active } : p)),
          audit: log(d, "product.toggle", sku),
        })),

      upsertCustomer: (c) =>
        upd((d) => ({
          ...d,
          customers: d.customers.some((x) => x.customer_id === c.customer_id)
            ? d.customers.map((x) => (x.customer_id === c.customer_id ? c : x))
            : [...d.customers, c],
          audit: log(d, "customer.save", c.customer_id),
        })),

      syncDeals: () =>
        upd((d) => ({
          ...d,
          deals: d.deals.map((x) => ({ ...x, synced_at: new Date().toISOString() })),
          audit: log(d, "pipedrive.sync", `${d.deals.length} deals`),
        })),

      createQuote: (dealId, customerId) => {
        const id = nextQuoteId(data.quotations.map((q) => q.quote_id));
        upd((d) => ({
          ...d,
          quotations: [
            {
              quote_id: id,
              pipedrive_deal_id: dealId,
              customer_id: customerId,
              customer_snapshot: null,
              status: "draft",
              lines: [],
              totals: emptyTotals(),
              revision_of: null,
              superseded_by: null,
              approved_at: null,
              approved_by: null,
              created_at: new Date().toISOString(),
              created_by: d.actor,
            },
            ...d.quotations,
          ],
          audit: log(d, "quote.create", id),
        }));
        return id;
      },

      patchQuote: (id, next) =>
        upd((d) => ({
          ...d,
          quotations: d.quotations.map((q) => {
            if (q.quote_id !== id) return q;
            const merged = { ...q, ...next };
            const cust = d.customers.find((c) => c.customer_id === merged.customer_id);
            return { ...merged, totals: computeTotals(merged.lines, cust?.type ?? null) };
          }),
        })),

      setQuoteLines: (id, lines) =>
        upd((d) => ({
          ...d,
          quotations: d.quotations.map((q) => {
            if (q.quote_id !== id) return q;
            const cust = d.customers.find((c) => c.customer_id === q.customer_id);
            return { ...q, lines, totals: computeTotals(lines, cust?.type ?? null) };
          }),
        })),

      approveQuote: (id) =>
        upd((d) => {
          const q = d.quotations.find((x) => x.quote_id === id);
          const cust = d.customers.find((c) => c.customer_id === q?.customer_id);
          if (!q || !cust) return d;
          const deal = d.deals.find((x) => x.pipedrive_deal_id === q.pipedrive_deal_id);
          return {
            ...d,
            quotations: d.quotations.map((x) =>
              x.quote_id === id
                ? {
                    ...x,
                    status: "approved",
                    customer_snapshot: snapshotCustomer(cust, deal?.hotel_name),
                    approved_at: new Date().toISOString(),
                    approved_by: d.actor,
                  }
                : x,
            ),
            audit: log(d, "quote.approve", id),
          };
        }),

      reviseQuote: (id) => {
        const src = data.quotations.find((q) => q.quote_id === id)!;
        const newId = revisionIdFor(id);
        upd((d) => ({
          ...d,
          quotations: [
            {
              ...src,
              quote_id: newId,
              status: "draft",
              customer_snapshot: null,
              revision_of: id,
              superseded_by: null,
              approved_at: null,
              approved_by: null,
              created_at: new Date().toISOString(),
              created_by: d.actor,
            },
            ...d.quotations.map((q) =>
              q.quote_id === id ? { ...q, status: "revised" as const, superseded_by: newId } : q,
            ),
          ],
          audit: log(d, "quote.revise", `${id} → ${newId}`),
        }));
        return newId;
      },

      newContractId: () => nextContractId(data.contracts.map((c) => c.contract_id)),

      addContracts: (list) =>
        upd((d) => ({
          ...d,
          contracts: [...list, ...d.contracts],
          audit: log(d, "contract.generate", list.map((c) => c.contract_id).join(", ")),
        })),

      patchContract: (id, next) =>
        upd((d) => ({
          ...d,
          contracts: d.contracts.map((c) => (c.contract_id === id ? { ...c, ...next } : c)),
        })),

      requestInv: (contractIds) => {
        const caseNo = nextCaseNumber(data.invRequests.map((r) => r.case_number));
        upd((d) => ({
          ...d,
          invRequests: [
            {
              case_number: caseNo,
              contract_ids: contractIds,
              from_app: "PS",
              requested_by: d.actor,
              requested_at: new Date().toISOString(),
              status: "new",
              invoice_id: null,
            },
            ...d.invRequests,
          ],
          contracts: d.contracts.map((c) =>
            contractIds.includes(c.contract_id)
              ? { ...c, case_number: caseNo, status: "inquiry_inv" as const }
              : c,
          ),
          audit: log(d, "inv.request", caseNo),
        }));
        return caseNo;
      },

      addReports: (list) =>
        upd((d) => ({
          ...d,
          reports: [
            ...list,
            ...d.reports.filter(
              (r) =>
                !list.some(
                  (n) =>
                    n.contract_id === r.contract_id &&
                    n.sku === r.sku &&
                    n.period_year === r.period_year &&
                    n.period_month === r.period_month,
                ),
            ),
          ],
          audit: log(d, "production.upload", `${list.length} รายการ`),
        }));

      ,createInvoice: (caseNumber, lines, period) => {
        const id = nextInvoiceId(data.invoices.map((i) => i.invoice_id));
        upd((d) => {
          const req = d.invRequests.find((r) => r.case_number === caseNumber);
          const contract = d.contracts.find((c) => c.case_number === caseNumber);
          const snapshot = contract?.customer_snapshot;
          if (!snapshot) return d;
          return {
            ...d,
            invoices: [
              {
                invoice_id: id,
                case_number: caseNumber,
                contract_ids: req?.contract_ids ?? [],
                customer_snapshot: snapshot,
                billing_period_start: period.start,
                billing_period_end: period.end,
                lines,
                totals: computeTotals(lines, snapshot.type),
                status: "draft",
                issued_at: null,
                issued_by: null,
                paid_at: null,
                created_at: new Date().toISOString(),
              },
              ...d.invoices,
            ],
            invRequests: d.invRequests.map((r) =>
              r.case_number === caseNumber
                ? { ...r, status: "in_progress" as const, invoice_id: id }
                : r,
            ),
            audit: log(d, "invoice.draft", id),
          };
        });
        return id;
      },

      issueInvoice: (id) => {
        const token = crypto.randomUUID().slice(0, 8);
        upd((d) => {
          const inv = d.invoices.find((i) => i.invoice_id === id);
          if (!inv) return d;
          return {
            ...d,
            invoices: d.invoices.map((i) =>
              i.invoice_id === id
                ? {
                    ...i,
                    status: "sent_via_live_link" as const,
                    issued_at: new Date().toISOString(),
                    issued_by: d.actor,
                  }
                : i,
            ),
            liveLinks: [
              {
                token,
                case_number: inv.case_number,
                contract_ids: inv.contract_ids,
                invoice_id: inv.invoice_id,
                events: [],
                signature_data_url: null,
                created_at: new Date().toISOString(),
              },
              ...d.liveLinks,
            ],
            invRequests: d.invRequests.map((r) =>
              r.case_number === inv.case_number ? { ...r, status: "live_link_sent" as const } : r,
            ),
            audit: log(d, "invoice.issue", id),
          };
        });
        return token;
      },

      markPaid: (invoiceId, method) => {
        const inv = data.invoices.find((i) => i.invoice_id === invoiceId);
        if (!inv) return null;
        const reId = taxReceiptIdFor(invoiceId);
        const at = new Date().toISOString();
        upd((d) => ({
          ...d,
          invoices: d.invoices.map((i) =>
            i.invoice_id === invoiceId ? { ...i, status: "paid" as const, paid_at: at } : i,
          ),
          taxReceipts: d.taxReceipts.some((t) => t.tax_receipt_id === reId)
            ? d.taxReceipts
            : [
                {
                  tax_receipt_id: reId,
                  from_invoice_id: invoiceId,
                  customer_snapshot: inv.customer_snapshot,
                  lines: inv.lines,
                  totals: inv.totals,
                  payment_method: method,
                  paid_at: at,
                  issued_at: at,
                  status: "issued" as const,
                },
                ...d.taxReceipts,
              ],
          contracts: d.contracts.map((c) =>
            inv.contract_ids.includes(c.contract_id)
              ? { ...c, status: "contract_completed" as const }
              : c,
          ),
          invRequests: d.invRequests.map((r) =>
            r.case_number === inv.case_number ? { ...r, status: "completed" as const } : r,
          ),
          audit: log(d, "invoice.paid", `${invoiceId} → ${reId}`),
        }));
        return reId;
      },

      voidTaxReceipt: (id, reason) =>
        upd((d) => ({
          ...d,
          taxReceipts: d.taxReceipts.map((t) =>
            t.tax_receipt_id === id ? { ...t, status: "void" as const, void_reason: reason } : t,
          ),
          audit: log(d, "tax_receipt.void", id),
        })),

      liveLinkByToken: (token) => data.liveLinks.find((l) => l.token === token),

      signLiveLink: (token, signature) =>
        upd((d) => {
          const link = d.liveLinks.find((l) => l.token === token);
          if (!link) return d;
          const at = new Date().toISOString();
          return {
            ...d,
            liveLinks: d.liveLinks.map((l) =>
              l.token === token
                ? {
                    ...l,
                    signature_data_url: signature,
                    events: [...l.events, { type: "signed" as const, at }],
                  }
                : l,
            ),
            contracts: d.contracts.map((c) =>
              link.contract_ids.includes(c.contract_id)
                ? { ...c, status: "customer_completed" as const, live_link_signed_at: at }
                : c,
            ),
            audit: log(d, "live_link.signed", token),
          };
        }),

      payLiveLink: (token) =>
        upd((d) => {
          const link = d.liveLinks.find((l) => l.token === token);
          const inv = d.invoices.find((i) => i.invoice_id === link?.invoice_id);
          if (!link || !inv) return d;
          const at = new Date().toISOString();
          const reId = taxReceiptIdFor(inv.invoice_id);
          return {
            ...d,
            liveLinks: d.liveLinks.map((l) =>
              l.token === token ? { ...l, events: [...l.events, { type: "paid" as const, at }] } : l,
            ),
            invoices: d.invoices.map((i) =>
              i.invoice_id === inv.invoice_id ? { ...i, status: "paid" as const, paid_at: at } : i,
            ),
            taxReceipts: d.taxReceipts.some((t) => t.tax_receipt_id === reId)
              ? d.taxReceipts
              : [
                  {
                    tax_receipt_id: reId,
                    from_invoice_id: inv.invoice_id,
                    customer_snapshot: inv.customer_snapshot,
                    lines: inv.lines,
                    totals: inv.totals,
                    payment_method: "LIVE Link (จำลอง)",
                    paid_at: at,
                    issued_at: at,
                    status: "issued" as const,
                  },
                  ...d.taxReceipts,
                ],
            contracts: d.contracts.map((c) =>
              link.contract_ids.includes(c.contract_id)
                ? { ...c, status: "contract_completed" as const }
                : c,
            ),
            invRequests: d.invRequests.map((r) =>
              r.case_number === link.case_number ? { ...r, status: "completed" as const } : r,
            ),
            audit: log(d, "live_link.paid", token),
          };
        }),
    };
  }, [data, hydrated, log]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCrm must be used inside CrmStoreProvider");
  return ctx;
}
