// Allowed dropdown values on the TARGET fields we prefill during lead conversion.
// Source (Leads/ConferenceLead) dropdowns are looser than the target fields, so any
// value not in these sets is silently omitted from the prefill instead of sent —
// sending an invalid dropdown value would reject the whole native create call.

export const CUSTOMER_COUNTRY_OPTIONS = new Set([
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Netherlands', 'Norway', 'Poland',
  'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'Türkiye', 'Ukraine', 'United Kingdom',
]);

export const CUSTOMER_INDUSTRY_OPTIONS = new Set([
  'Aerospace', 'Apparel', 'Education', 'Government', 'Healthcare', 'Mattress',
  'Military', 'Sport', 'TestLab', 'Textiles', 'Transportation', 'Other',
]);

export const OPP_PRODUCT_FAMILY_OPTIONS = new Set([
  '306 - GHP', '306 - SGHP', '306 - SDHP', '316 - ST-2XL', '403 - TPP', '419 - RPP',
  '431 - iSGHP', '431 - iSDHP', '461 - CCHR', '501 - Newton', '502 - NEMO', '504 - Child',
  '505 - Head', '506 - Hand', '507 - Foot', '509 - STAN', '510 - Burnie', '513 - Baby',
  '514 - DRT', '515 - ANDI', '520 - Flash Fire ', '521 - Liz', '522 - ACE',
]);
