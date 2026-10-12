import type { Contract, Customer, Invoice } from './crm-types';

type HotelIdentity = { id: string; name: string };
type Profile = { property_id: string; service: string; orm_team?: string | null; marcom_member_id?: string | null };

/** Resolve legacy names only when the master identifies exactly one hotel. Never overwrite a stamped ID. */
export function resolveContractHotel(contract: Contract, customers: Customer[], hotels: HotelIdentity[] = []): Contract {
  if (contract.hotel_id) return contract;
  const name = contract.customer_snapshot.hotel_name.trim();
  if (!name) return contract;
  const master = hotels.filter(h => h.name.trim() === name);
  const candidates = master.length ? master.map(h => h.id) : customers
    .filter(c => c.customer_id === contract.customer_snapshot.customer_id)
    .flatMap(c => c.hotels.filter(h => h.name.trim() === name).map(h => h.hotel_id));
  const ids = [...new Set(candidates.filter(Boolean))];
  const id = ids.length === 1 ? ids[0] : undefined;
  return id ? { ...contract, hotel_id: id } : contract;
}

/** No name joins at invoice projection time; a multi-contract legacy invoice needs one unambiguous ID. */
export function stampInvoiceHotel(invoice: Invoice, contracts: Contract[]): Invoice {
  if (invoice.hotel_id || !invoice.contract_ids.length) return invoice;
  const linked = invoice.contract_ids.map(id => contracts.find(c => c.contract_id === id));
  if (linked.some(c => !c?.hotel_id)) return invoice;
  const ids = [...new Set(linked.map(c => c?.hotel_id))];
  const id = ids.length === 1 ? ids[0] : undefined;
  return id ? { ...invoice, hotel_id: id } : invoice;
}

/** Current WS-2 assignment is authoritative; ambiguous Marcom subprofiles never select an arbitrary owner. */
export function attributedOwner(invoice: Invoice, profiles: Profile[]) {
  if (!invoice.hotel_id || !invoice.service_line) return null;
  const matches = profiles.filter(p => p.property_id === invoice.hotel_id && (
    invoice.service_line === 'ORM' ? p.service === 'ORM' : ['MARCOM_MT', 'MARCOM_GMB'].includes(p.service)
  ));
  const owners = [...new Set(matches.map(p => invoice.service_line === 'ORM' ? p.orm_team : p.marcom_member_id).filter(Boolean))];
  return { hotel_id: invoice.hotel_id, service_line: invoice.service_line, owner: owners.length === 1 ? owners[0] : null };
}