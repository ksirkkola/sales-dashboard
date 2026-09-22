import {
  Badge, Box, Heading, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import type { OpportunityRow } from '../utils/opportunities';
import { fmtEUR, num, yearFromSec } from '../utils/insight';

interface Props {
  hailer: HailerApi;
  opportunities: OpportunityRow[];
  selectedYear: string;
}

interface Agg { count: number; value: number }

function aggregateBy(rows: OpportunityRow[], keyFn: (r: OpportunityRow) => string): Record<string, Agg> {
  const out: Record<string, Agg> = {};
  rows.forEach(r => {
    const key = keyFn(r) || 'Unknown';
    if (!out[key]) out[key] = { count: 0, value: 0 };
    out[key].count++;
    out[key].value += num(r.quotedRevenue);
  });
  return out;
}

function sortedEntries(agg: Record<string, Agg>): [string, Agg][] {
  return Object.entries(agg).sort((a, b) => b[1].value - a[1].value);
}

export default function RevenuePanel({ hailer, opportunities, selectedYear }: Props) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.700');
  const theadBg = useColorModeValue('gray.50', 'gray.800');
  const rowHover = useColorModeValue('gray.50', 'gray.600');
  const ALL_YEARS = 'All Years';

  const wonAllTime = useMemo(() => opportunities.filter(o => o.phase === 'Closed - Won'), [opportunities]);
  const wonInYear = useMemo(() => selectedYear === ALL_YEARS
    ? wonAllTime
    : wonAllTime.filter(o => yearFromSec(o.closedWonDate) === selectedYear),
    [wonAllTime, selectedYear]);

  const totalWonValue = wonInYear.reduce((s, o) => s + num(o.quotedRevenue), 0);
  const totalCommission = wonInYear.reduce((s, o) => s + num(o.commissionAmount), 0);
  const avgDealSize = wonInYear.length > 0 ? totalWonValue / wonInYear.length : 0;

  const byProduct = useMemo(() => sortedEntries(aggregateBy(wonInYear, r => r.productFamily || 'Unknown')), [wonInYear]);
  const byRep = useMemo(() => sortedEntries(aggregateBy(wonInYear, r => r.accountManagerName)), [wonInYear]);
  const byAccount = useMemo(() => sortedEntries(aggregateBy(wonInYear, r => r.accountName || 'Unknown')), [wonInYear]);

  return (
    <Box>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="green.400">
          <Stat><StatLabel>Won Revenue</StatLabel><StatNumber fontSize="lg">{fmtEUR(totalWonValue)}</StatNumber>
            <StatHelpText>{wonInYear.length} deal{wonInYear.length === 1 ? '' : 's'}</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Avg Deal Size</StatLabel><StatNumber fontSize="lg">{fmtEUR(avgDealSize)}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Agent Commissions</StatLabel><StatNumber fontSize="lg">{fmtEUR(totalCommission)}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Deals Won</StatLabel><StatNumber fontSize="lg">{wonInYear.length}</StatNumber></Stat>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box>
          <Heading size="xs" mb={2} color="gray.500">By Product Family</Heading>
          <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}><Tr><Th>Product</Th><Th isNumeric>Revenue</Th></Tr></Thead>
              <Tbody>
                {byProduct.length === 0
                  ? <Tr><Td colSpan={2}><Text color="gray.500" fontSize="sm">No data</Text></Td></Tr>
                  : byProduct.map(([name, agg]) => (
                    <Tr key={name}><Td fontSize="sm" maxW="140px" isTruncated>{name}</Td><Td isNumeric fontSize="sm">{fmtEUR(agg.value)}</Td></Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <Box>
          <Heading size="xs" mb={2} color="gray.500">Rep Leaderboard</Heading>
          <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}><Tr><Th>Rep</Th><Th isNumeric>Won</Th><Th isNumeric>Revenue</Th></Tr></Thead>
              <Tbody>
                {byRep.length === 0
                  ? <Tr><Td colSpan={3}><Text color="gray.500" fontSize="sm">No data</Text></Td></Tr>
                  : byRep.map(([name, agg]) => (
                    <Tr key={name}><Td fontSize="sm">{name}</Td><Td isNumeric fontSize="sm">{agg.count}</Td><Td isNumeric fontSize="sm">{fmtEUR(agg.value)}</Td></Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <Box>
          <Heading size="xs" mb={2} color="gray.500">Top Accounts</Heading>
          <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg={theadBg}><Tr><Th>Account</Th><Th isNumeric>Revenue</Th></Tr></Thead>
              <Tbody>
                {byAccount.length === 0
                  ? <Tr><Td colSpan={2}><Text color="gray.500" fontSize="sm">No data</Text></Td></Tr>
                  : byAccount.slice(0, 10).map(([name, agg]) => (
                    <Tr key={name}><Td fontSize="sm" maxW="140px" isTruncated>{name}</Td><Td isNumeric fontSize="sm">{fmtEUR(agg.value)}</Td></Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </SimpleGrid>

      <Heading size="sm" mb={3} color="green.600" textTransform="uppercase" letterSpacing="wide">Won Deals</Heading>
      {wonInYear.length === 0 ? (
        <Text color="gray.500">No won deals in this period.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th>Name</Th><Th>Account</Th><Th>Rep</Th><Th isNumeric>Revenue</Th><Th>Won Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {wonInYear
                .sort((a, b) => num(b.closedWonDate) - num(a.closedWonDate))
                .map(o => (
                  <Tr key={o.activityId} _hover={{ bg: rowHover }} cursor="pointer"
                    onClick={() => hailer.ui.activity.open(o.activityId)}>
                    <Td fontWeight="medium" maxW="220px" isTruncated>{o.opportunityName}</Td>
                    <Td maxW="160px" isTruncated>{o.accountName || '—'}</Td>
                    <Td fontSize="xs">{o.accountManagerName}</Td>
                    <Td isNumeric>{fmtEUR(o.quotedRevenue)}</Td>
                    <Td fontSize="xs"><Badge colorScheme="green">{yearFromSec(o.closedWonDate)}</Badge></Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
