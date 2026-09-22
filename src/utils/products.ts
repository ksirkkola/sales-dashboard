// Product Family / Product Name options for the Opportunity workflow's
// "Product Family" and "Product Name" predefined-options fields, plus the
// logic to filter Product Name down to just the ones matching a chosen
// family — so users picking a product don't have to scroll through all ~40
// options every time.
//
// Matching rule: every Product Name starts with its family's numeric code
// followed by a dash (e.g. "306-3XX_a - ..." belongs to code "306"). Most
// codes only have one family, so the code prefix alone is enough. A few
// codes are shared by more than one family (e.g. "306" covers GHP/SGHP/SDHP,
// "431" covers iSGHP/iSDHP) — for those we additionally require the family's
// suffix (e.g. "GHP") to appear in the product name as a whole word, so
// "GHP" doesn't accidentally match inside "SGHP".
//
// If Product Family/Product Name options are ever edited in the workspace,
// update these two arrays to match (workspace/opportunity_.../fields.ts is
// the source of truth) — the filtering logic itself needs no changes.

export const PRODUCT_FAMILIES: string[] = [
  '306 - GHP',
  '306 - SGHP',
  '306 - SDHP',
  '316 - ST-2XL',
  '403 - TPP',
  '419 - RPP',
  '431 - iSGHP',
  '431 - iSDHP',
  '461 - CCHR',
  '501 - Newton',
  '502 - NEMO',
  '504 - Child',
  '505 - Head',
  '506 - Hand',
  '507 - Foot',
  '509 - STAN',
  '510 - Burnie',
  '513 - Baby',
  '514 - DRT',
  '515 - ANDI',
  '520 - Flash Fire ',
  '521 - Liz',
  '522 - ACE',
  '600 - Custom',
];

export const PRODUCT_NAMES: string[] = [
  '306-3XX_a - Guarded Hotplate 10.5 with compression (For ASTM 3340) - GHP',
  '306-3XX  - Guarded Hotplate 10.5 w/o compression - GHP',
  '306-4XX_C - Sweating Guarded Hotplate 10.5 - SGHP',
  '306-2XX_C - Sweating Guarded Hotplate 8.2 - SGHP',
  '306-2XX_C.D - Sweating Dynamic Hotplate 8.2 - SDHP',
  '316-XXX - Mattress Tester - ST-2XL ',
  '403-XXX - Thermal Protective Performance (TPP)',
  '419-XXX - Radiant Protective Performance (RPP), ASTM (NFPA)',
  '431-2XX - Integrated Sweating Guarded Hotplate 8.2 - iSGHP',
  '431-4XX - Integrated Sweating Guarded Hotplate 10.5 - iSGHP',
  '431-2XX_D.C - Integrated Sweating Dynamic Hotplate 8.2 w/ Plenum (ASTM F1868 & F3628) - iSDHP',
  '461-XXX - Conductive & Compressive Heat Resistance (CCHR)',
  '501-XXX_s30.M - Newton Manikin, 30Z, Sweating, Male 178.5 cm',
  '501-XXX_d30.M - Newton Manikin, 30Z, Dry, Male 178.5 cm ',
  '502-XXX_C.d22.M - Nemo Manikin, 22Z, Dry, Male 178.5 cm ',
  '502-XXX_C.s22.M - Nemo Manikin, 22Z, Sweating, Male 178.5 cm ',
  '502-XXX_C.d22.F - Shemo Manikin, 22Z, Dry, Female 166 cm',
  '502-XXX_C.s22.F - Shemo Manikin, 22Z, Sweating, Female 166 cm',
  '504-XXX_C.d16.y - Child Manikin, 16Z, Dry, 8 year old, 127 cm',
  '504-XXX_C.d16.Y - Child Manikin, 16Z, Dry, 10 year old, 140 cm ',
  '504-XXX_C.s16.y - Child Manikin, 16Z, Sweating, 8 year old, 127 cm',
  '504-XXX_C.s16.Y - Child Manikin, 16Z, Sweating, 10 year old,140 cm  ',
  '505-XXX_s9 - Thermal Head, 9Z, Sweating',
  '506-XXX_s8 - Thermal Hand, 8Z, Sweating',
  '506-XXX_C.d8 - Thermal Hand, 8Z, Dry',
  '507-XXX_.s12.M - Thermal Foot, Sweating, 12Z, Male, Size 9',
  '507-XXX_C.s12.M.a - Thermal Foot, Sweating, 12Z, Male, Size 9, Actuated/Compression System',
  '509-XXX_s - STAN Manikin, Sweating, Male',
  '510-XXX_M - Burnie, Flame Test Manikin, Unjointed - Male',
  '510-XXX_F - Burnadette Test Manikin, Unjointed - Female',
  '513-XXX_C.s12 - Baby Manikin, 12Z, Gender Neutral',
  '514-XXX - DRT-201 System, Standard',
  '515-XXX_s35.M - ANDI Manikin, 35Z, Sweating/Active Cooling, Male 178.5 cm',
  '515-XXX_d35.M - ANDI Manikin, 35Z, Dry/Active Cooling, Male 178.5 cm',
  '515-XXX_s35.b.M - ANDI Manikin, 35Z, Sweating/Active Cooling, Male 178.5 cm, Breathing Prepped',
  '520-XXX - Flash Fire Base System',
  '521-XXX_s30.F - Liz Manikin, 30Z, Sweating, Female 167 cm',
  '521-XXX_d30.F - Liz Manikin, 30Z, Dry, Female 167 cm',
  '522-XXX - ACE',
  'Custom System',
];

function familyCode(family: string): string {
  return family.split(' - ')[0]?.trim() ?? family;
}

function familySuffix(family: string): string {
  const parts = family.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const codeCounts: Record<string, number> = {};
PRODUCT_FAMILIES.forEach(f => {
  const code = familyCode(f);
  codeCounts[code] = (codeCounts[code] || 0) + 1;
});

export function getProductNamesForFamily(family: string): string[] {
  const code = familyCode(family);
  const suffix = familySuffix(family);
  const ambiguous = (codeCounts[code] || 0) > 1;
  const prefixMatches = PRODUCT_NAMES.filter(name => {
    if (!name.startsWith(`${code}-`)) return false;
    if (!ambiguous || !suffix) return true;
    const re = new RegExp(`(^|[^a-zA-Z])${escapeRegExp(suffix)}([^a-zA-Z]|$)`, 'i');
    return re.test(name);
  });
  if (prefixMatches.length > 0) return prefixMatches;
  // Fallback for products with no numbered item code at all (e.g. one-off
  // custom builds like "600 - Custom" -> "Custom System") — match by the
  // family's suffix appearing in the product name instead of a code prefix.
  if (!suffix) return [];
  return PRODUCT_NAMES.filter(name => name.toLowerCase().includes(suffix.trim().toLowerCase()));
}
