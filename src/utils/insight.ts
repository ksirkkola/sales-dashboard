export type InsightRow = Record<string, unknown>;

export function parseInsight(data: { headers: string[]; rows: unknown[][] }): InsightRow[] {
  return data.rows.map(row => {
    const r: InsightRow = {};
    data.headers.forEach((h, i) => { r[h] = row[i]; });
    return r;
  });
}

export function fmtEUR(val: unknown): string {
  const n = Number(val);
  if (val === null || val === undefined || isNaN(n)) return '—';
  return '€' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function num(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// Meta created/updated are ms; custom date fields from insights are seconds.
export function fmtDateMs(val: unknown): string {
  const n = Number(val);
  if (!val || isNaN(n)) return '—';
  return new Date(n).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateSec(val: unknown): string {
  const n = Number(val);
  if (!val || isNaN(n)) return '—';
  return new Date(n * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function yearFromMs(val: unknown): string {
  const n = Number(val);
  if (!val || isNaN(n)) return 'Unknown';
  return new Date(n).getFullYear().toString();
}

export function yearFromSec(val: unknown): string {
  const n = Number(val);
  if (!val || isNaN(n)) return 'Unknown';
  return new Date(n * 1000).getFullYear().toString();
}
