export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
