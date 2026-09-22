import type { HailerApi } from '@hailer/app-sdk';
import { INSIGHT_OPPORTUNITIES } from '../constants/ids';
import { parseInsight } from './insight';

export interface OpportunityRow {
  activityId: string;
  opportunityName: string;
  phase: string;
  created: number;
  productFamily: string | null;
  productName: string | null;
  quotedRevenue: number | null;
  poAmount: number | null;
  initialLeadContact: number | null;
  closeDate: number | null;
  closedWonDate: number | null;
  closedLostDate: number | null;
  lossReason: string | null;
  expectedDecision: number | null;
  commissionAmount: number | null;
  finalDestinationCountry: string | null;
  nextFollowupDate: number | null;
  accountName: string | null;
  accountManagerName: string;
  accountManagerId: string | null;
  industry: string | null;
  country: string | null;
  agentName: string | null;
}

export async function loadOpportunities(hailer: HailerApi): Promise<OpportunityRow[]> {
  const data = await hailer.insight.data(INSIGHT_OPPORTUNITIES, { update: true });
  return parseInsight(data) as unknown as OpportunityRow[];
}
