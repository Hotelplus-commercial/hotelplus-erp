# BD APP pages (UAT Polish R2 Patch A, 2026-11-06)
- Demand Calendar, ADR Calculator, Package Calculator, ใบเสนอราคา copy the real portal screenshots; sample data lives in code (src/lib/bd/*, quotation-list-page QUOTE_SAMPLE), never in storage. Why: prototype pages without DB change.
- ADR rule = weekday × 71.51% + weekend × 28.49%, overall room-weighted (src/lib/bd/adr.ts). Confirmed by Sai 2026-11-06 (portal uses the same room-weighted ADR).
- ORM package formula unknown: results show only for the IMG-3 sample input (sameAsSample); never invent a formula. Marcom recommendation unknown: channels used in survey Q3 first (channelOrder).
- Package Calculator cart is in memory only; Google = GMB, TikTok includes ADDON-KOL-TRAVEL, SETUP lines are one-time.
- Routes are un-nested (bd_.<page>.tsx) so the old BD tab strip does not wrap them; /bd/calculator redirects to /bd/package-calculator keeping params.
- Meeting Analyzer (SP9) copies IMG-7; sample data only in src/lib/bd/meeting-analyzer-sample.ts; filters act on the sample; New Analysis / History are placeholders.
