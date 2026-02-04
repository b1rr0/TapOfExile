const SUFFIXES: string[] = ["", "K", "M", "B", "T", "Q"];

export function formatNumber(n: number): string {
  if (n < 1000) return String(Math.floor(n));

  let tier = 0;
  let scaled = n;
  while (scaled >= 1000 && tier < SUFFIXES.length - 1) {
    scaled /= 1000;
    tier++;
  }

  const formatted = scaled >= 100 ? Math.floor(scaled) : scaled.toFixed(1);
  return `${formatted}${SUFFIXES[tier]}`;
}
