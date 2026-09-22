import type { HailerApi } from '@hailer/app-sdk';
import { INSIGHT_RENTALS, INSIGHT_RENTAL_FLEET } from '../constants/ids';
import { parseInsight } from './insight';

export interface RentalRow {
  activityId: string;
  rentalName: string;
  phase: string;
  created: number;
  rentalStart: number | null;
  returnDue: number | null;
  actualReturn: number | null;
  weeklyRate: number | null;
  deposit: number | null;
  totalRevenue: number | null;
  conditionOnReturn: string | null;
  damageCharges: number | null;
  productFamily: string | null;
  lossReason: string | null;
  deliveryTrip: string | null;
  accountName: string | null;
  accountId: string | null;
  unitId: string | null;
  unitName: string | null;
  unitStatus: string | null;
}

export interface FleetUnitRow {
  activityId: string;
  unitName: string;
  productFamily: string | null;
  serialNumber: string | null;
  status: string;
  nextCalibrationDue: number | null;
  currentRenter: string | null;
}

export async function loadRentals(hailer: HailerApi): Promise<RentalRow[]> {
  const data = await hailer.insight.data(INSIGHT_RENTALS, { update: true });
  return parseInsight(data) as unknown as RentalRow[];
}

export async function loadFleet(hailer: HailerApi): Promise<FleetUnitRow[]> {
  const data = await hailer.insight.data(INSIGHT_RENTAL_FLEET, { update: true });
  return parseInsight(data) as unknown as FleetUnitRow[];
}
