/** R1.1 — renewal card → Contract Wizard. Pure: picks the existing deal for the card's hotel. */
type DealLike = { deal_id: string; hotel_id: string | null; hotel_name: string };

export function renewalWizardDealId(card: { hotelId: string; hotel: string }, deals: DealLike[]): string {
  const name = card.hotel.trim().toLowerCase();
  const hit =
    deals.find((d) => d.hotel_id && d.hotel_id === card.hotelId) ??
    deals.find((d) => d.hotel_name.trim().toLowerCase() === name);
  return hit?.deal_id ?? card.hotelId;
}

/** Only the bare old menu URL redirects; any id-carrying wizard path opens the Wizard. */
export function wizardPathRedirects(pathname: string, search = ""): boolean {
  const p = pathname.replace(/\/+$/, "");
  return p === "/ps/contract-wizard" && !search.replace(/^\?/, "");
}
