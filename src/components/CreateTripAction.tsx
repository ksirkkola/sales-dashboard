import { Badge, Button, HStack } from '@chakra-ui/react';
import { useState } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import {
  RENTALS_FIELD_DELIVERY_TRIP, TRIPS_IHS_FIELD, TRIPS_IHS_PHASE_TRIAGE, WORKFLOW_TRIPS_IHS,
} from '../constants/ids';
import type { RentalRow } from '../utils/rentals';

interface Props {
  hailer: HailerApi;
  rental: RentalRow;
  onDone: () => void;
}

export default function CreateTripAction({ hailer, rental, onDone }: Props) {
  const [busy, setBusy] = useState(false);

  const notify = (text: string) => {
    hailer.ui.snackbar.open(text, 'OK', 3500).catch(() => {});
  };

  async function handleCreateTrip() {
    setBusy(true);
    try {
      const fields: Record<string, string> = {
        [TRIPS_IHS_FIELD.purposeForOnsiteTrip]: 'Training',
        [TRIPS_IHS_FIELD.serviceType]: 'Training',
        [TRIPS_IHS_FIELD.asset]: `${rental.unitName || 'Rental unit'} (Rental — see linked activity)`,
      };
      if (rental.accountId) fields[TRIPS_IHS_FIELD.customer] = rental.accountId;

      const trip = await hailer.ui.activity.create(WORKFLOW_TRIPS_IHS, {
        name: `${rental.accountName || rental.rentalName} - ${rental.unitName || ''} - Training/Delivery`.trim(),
        phaseId: TRIPS_IHS_PHASE_TRIAGE,
        fields,
      });

      if (!trip) { setBusy(false); return; } // rep cancelled

      await hailer.activity.update([
        { _id: rental.activityId, fields: { [RENTALS_FIELD_DELIVERY_TRIP]: trip._id } },
      ], {});

      notify('Trip scheduled and linked to this rental.');
      onDone();
    } catch (err) {
      console.error('Create trip failed:', err);
      notify("We couldn't schedule the trip. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (rental.deliveryTrip) {
    return (
      <Badge colorScheme="blue" cursor="pointer" onClick={() => hailer.ui.activity.open(rental.deliveryTrip!)}>
        ✓ Trip Scheduled
      </Badge>
    );
  }

  return (
    <HStack>
      <Button size="xs" colorScheme="blue" variant="outline" isLoading={busy} onClick={handleCreateTrip}>
        Schedule Trip
      </Button>
    </HStack>
  );
}
