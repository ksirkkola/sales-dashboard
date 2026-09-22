import {
  Badge, Box, Flex, Heading, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { RentalRow, FleetUnitRow } from '../utils/rentals';
import { fmtEUR, num, yearFromSec } from '../utils/insight';
import { FLEET_STATUS_COLOR, RENTAL_PHASE_COLOR } from '../constants/ids';
import CreateTripAction from './CreateTripAction';

interface Props {
  hailer: HailerApi;
  rentals: RentalRow[];
  fleet: FleetUnitRow[];
  selectedYear: string;
  onRefresh: () => void;
}

const PHASE_HEX: Record<string, string> = {
  Discovery: '#4A90D9',
  Proposal: '#E67E22',
  Agreement: '#F5A623',
  'Out on Rental': '#8E44AD',
  Returned: '#17A2B8',
  'Closed - Completed': '#27AE60',
};

function secToISODate(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

// FullCalendar's `end` for all-day events is exclusive — add one day so the
// return-due date itself renders as part of the booking bar.
function exclusiveEndISODate(sec: number): string {
  const d = new Date(sec * 1000);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function RentalsPanel({ hailer, rentals, fleet, selectedYear, onRefresh }: Props) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.700');
  const theadBg = useColorModeValue('gray.50', 'gray.800');
  const rowHover = useColorModeValue('gray.50', 'gray.600');
  const ALL_YEARS = 'All Years';

  const activeRentals = rentals.filter(r => r.phase === 'Out on Rental');
  const availableUnits = fleet.filter(f => f.status === 'Available').length;
  const utilization = fleet.length > 0 ? Math.round((activeRentals.length / fleet.length) * 100) : null;

  const completedInYear = useMemo(() => rentals.filter(r => {
    if (r.phase !== 'Closed - Completed') return false;
    if (selectedYear === ALL_YEARS) return true;
    return yearFromSec(r.actualReturn || r.returnDue) === selectedYear;
  }), [rentals, selectedYear]);

  const rentalRevenue = completedInYear.reduce((s, r) => s + num(r.totalRevenue), 0);

  const calendarEvents = useMemo(() => rentals
    .filter(r => r.phase !== 'Closed - Lost' && r.rentalStart && r.returnDue)
    .map(r => {
      const endSec = r.actualReturn && r.actualReturn > (r.returnDue || 0) ? r.actualReturn : r.returnDue!;
      return {
        title: `${r.unitName || 'Unit'} — ${r.accountName || r.rentalName}`,
        start: secToISODate(r.rentalStart!),
        end: exclusiveEndISODate(endSec),
        allDay: true,
        backgroundColor: PHASE_HEX[r.phase] || '#9B9B9B',
        borderColor: PHASE_HEX[r.phase] || '#9B9B9B',
        extendedProps: { activityId: r.activityId },
      };
    }), [rentals]);

  return (
    <Box>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="purple.400">
          <Stat><StatLabel>Active Rentals</StatLabel><StatNumber fontSize="lg">{activeRentals.length}</StatNumber>
            <StatHelpText>Out on Rental now</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="green.400">
          <Stat><StatLabel>Fleet Available</StatLabel><StatNumber fontSize="lg">{availableUnits} / {fleet.length}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Fleet Utilization</StatLabel><StatNumber fontSize="lg">{utilization === null ? '—' : `${utilization}%`}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="green.400">
          <Stat><StatLabel>Rental Revenue ({selectedYear})</StatLabel><StatNumber fontSize="lg">{fmtEUR(rentalRevenue)}</StatNumber>
            <StatHelpText>{completedInYear.length} completed</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Rental Fleet</Heading>
      {fleet.length === 0 ? (
        <Text color="gray.500" mb={6}>No units in the fleet yet — add one in the 🚐 Rental Fleet workflow.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md" mb={8}>
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr><Th>Unit</Th><Th>Product Family</Th><Th>Serial #</Th><Th>Status</Th><Th>Current Renter</Th></Tr>
            </Thead>
            <Tbody>
              {fleet.map(f => (
                <Tr key={f.activityId} _hover={{ bg: rowHover }} cursor="pointer"
                  onClick={() => hailer.ui.activity.open(f.activityId)}>
                  <Td fontWeight="medium">{f.unitName}</Td>
                  <Td>{f.productFamily || '—'}</Td>
                  <Td fontSize="xs">{f.serialNumber || '—'}</Td>
                  <Td><Badge colorScheme={FLEET_STATUS_COLOR[f.status] || 'gray'}>{f.status}</Badge></Td>
                  <Td fontSize="xs">{f.currentRenter || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Booking Calendar</Heading>
      <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="md" p={3} mb={8}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={calendarEvents}
          eventClick={info => {
            const activityId = info.event.extendedProps.activityId as string;
            if (activityId) hailer.ui.activity.open(activityId);
          }}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        />
        <Flex gap={4} mt={3} wrap="wrap">
          {Object.entries(PHASE_HEX).map(([phase, hex]) => (
            <Flex key={phase} align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="sm" bg={hex} />
              <Text fontSize="xs" color="subtleText">{phase}</Text>
            </Flex>
          ))}
        </Flex>
      </Box>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">All Rentals</Heading>
      {rentals.length === 0 ? (
        <Text color="gray.500">No rentals yet.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th>Name</Th><Th>Account</Th><Th>Unit</Th><Th>Stage</Th>
                <Th isNumeric>Revenue</Th><Th>Return Due</Th><Th>Delivery / Training</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rentals.map(r => (
                <Tr key={r.activityId} _hover={{ bg: rowHover }}>
                  <Td fontWeight="medium" maxW="200px" isTruncated cursor="pointer"
                    onClick={() => hailer.ui.activity.open(r.activityId)}>
                    {r.rentalName}
                  </Td>
                  <Td maxW="160px" isTruncated>{r.accountName || '—'}</Td>
                  <Td maxW="140px" isTruncated>{r.unitName || '—'}</Td>
                  <Td><Badge colorScheme={RENTAL_PHASE_COLOR[r.phase] || 'gray'}>{r.phase}</Badge></Td>
                  <Td isNumeric>{fmtEUR(r.totalRevenue)}</Td>
                  <Td fontSize="xs">{r.returnDue ? secToISODate(r.returnDue) : '—'}</Td>
                  <Td>
                    {r.phase === 'Closed - Lost'
                      ? <Text fontSize="xs" color="subtleText">—</Text>
                      : <CreateTripAction hailer={hailer} rental={r} onDone={onRefresh} />}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
