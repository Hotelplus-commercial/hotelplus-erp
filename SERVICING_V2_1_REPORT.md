# Servicing v2.1 patch

## Delivered
- Chart ③ uses debounced ResizeObserver pixel measurements, without a stretched viewBox. Plot is centred, capped at 1200px, with height clamp(300px, width × 0.36, 460px), 48/16/28/32px inner margins. Circles are 14px, hovered-day circles 18px; median/grid strokes retain pixel widths.
- Seven-day Y ticks use the next multiple above the maximum plus the specified near-top headroom. Month labels sit at the visible month midpoint. Median, IQR and Compare B labels attach to their line/band; measured text bounds select a clear horizontal slot. Dense plots without a clear slot use the band's upper edge rather than cover dots.
- Day hit regions, dots, dashed hover line and flipped tooltip share the pixel scale; tooltip wording unchanged.
- Pipeline drill starts collapsed when its storage key is absent/unreadable. Both header toggles preserve selection, chips/stages/gap stat auto-open, stage selection scrolls only when off-screen. State persists at `psdash.drill.servicing.open`; rows, sorting, assignment/details and ticket actions are unchanged.
- Card ② already uses fixed-size CSS circles and unscaled HTML text: no redesign needed.

## Quartile method — unchanged
PS tab ④ and Servicing chart ③ both use `quantile` from `src/lib/ps-servicing.ts`: linear interpolation at index `(n − 1) × q` on sorted values. This is not median-of-halves. ORM fixture: median 20.5, Q1 17.25, Q3 23; displayed Q1 remains 17.3. No oracle rounding or calculation changes were made.

## Verification
- 82 existing tests passed, 400 assertions; preview build OK.
- Browser at 1280/1440/1920/390px: plot sizes 922×331.906 / 1082×389.516 / 1200×432 / 332×300, circles 14×14, no page overflow or browser errors. Card ② circles 12×12.
- Default collapsed, eight flag rows on open, two gap rows on gap selection, stage auto-open and reload persistence verified.
- July 18 tooltip retains 27 and 11 days, median 19; dashed line passes through both dots. Compare retains A/B values and labelled B median.
- No data/view/query/table, KPI, SLA, filter, summary content, ticket engine or operational write path changed. Live populated data remains dependent on the pre-existing Cloud mirror; visual verification used the existing demo fixture.