// All money is stored and computed as integer paise. Never use float math
// on money — convert to a display string only at the UI boundary.

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const inrFormatterNoDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPaise(paise: number, opts?: { decimals?: boolean }): string {
  const rupees = paiseToRupees(paise);
  return opts?.decimals === false
    ? inrFormatterNoDecimals.format(rupees)
    : inrFormatter.format(rupees);
}

export function formatCompactPaise(paise: number): string {
  const rupees = paiseToRupees(paise);
  const abs = Math.abs(rupees);
  if (abs >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return inrFormatter.format(rupees);
}

export function formatPercent(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}
