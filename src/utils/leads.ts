import type { HailerApi } from '@hailer/app-sdk';
import { INSIGHT_LEADS_COMBINED } from '../constants/ids';
import { parseInsight } from './insight';

export interface LeadRow {
  sourceSystem: 'Leads' | 'Conference';
  activityId: string;
  name: string;
  stage: string;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  leadSource: string;
  industry: string | null;
  country: string | null;
  productInterest: string | null;
  estimatedValue: number | null;
  assignedToId: string | null;
  assignedToName: string;
  convertedToCustomer: string | null;
  convertedToOpportunity: string | null;
  disqualifiedReason: string | null;
  nextFollowupDate: number | null;
  created: number;
}

export async function loadLeads(hailer: HailerApi): Promise<LeadRow[]> {
  const data = await hailer.insight.data(INSIGHT_LEADS_COMBINED, { update: true });
  return parseInsight(data) as unknown as LeadRow[];
}
