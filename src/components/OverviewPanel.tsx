import {
  Box, Flex, Heading, Select, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber,
  Text, Tooltip, useColorModeValue,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { Chart, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import type { LeadRow } from '../utils/leads';
import type { OpportunityRow } from '../utils/opportunities';
import type { RentalRow } from '../utils/rentals';
import { fmtEUR, num, yearFromSec } from '../utils/insight';

interface Props {
  leads: LeadRow[];
  opportunities: OpportunityRow[];
  rentals: RentalRow[];
  selectedYear: string;
  availableYears: string[];
  onYearChange: (year: string) => void;
}

const OPEN_PHASES = ['Discovery', 'Budgetary Review', 'Proposal', 'Negotiations'];
const ALL_YEARS = 'All Years';
const currentYear = new Date().getFullYear().toString();

// Win-probability per phase, used for the "Likely Amount" (weighted forecast) figures below.
const PHASE_PROBABILITY: Record<string, number> = {
  Discovery: 0,
  'Budgetary Review': 0.10,
  Proposal: 0.30,
  Negotiations: 0.80,
};

const REP_COLORS = ['#4A90D9', '#8E44AD', '#27AE60', '#E67E22', '#E74C3C', '#17A2B8'];
const DONUT_COLORS = ['#4A90D9', '#8E44AD', '#27AE60', '#E67E22', '#E74C3C', '#17A2B8', '#F5A623', '#9B9B9B', '#2ECC71', '#D4A017'];

function monthKey(sec: number): string {
  const d = new Date(sec * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function OverviewPanel({ leads, opportunities, rentals, selectedYear, availableYears, onYearChange }: Props) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const gridColor = useColorModeValue('#E2E8F0', '#4A5568');
  const tickColor = useColorModeValue('#4A5568', '#CBD5E0');

  const openOpps = useMemo(() => opportunities.filter(o => OPEN_PHASES.includes(o.phase)), [opportunities]);
  const wonAllTime = useMemo(() => opportunities.filter(o => o.phase === 'Closed - Won'), [opportunities]);
  const lostAllTime = useMemo(() => opportunities.filter(o => o.phase === 'Closed - Lost'), [opportunities]);
  const wonInYear = useMemo(() => selectedYear === ALL_YEARS
    ? wonAllTime
    : wonAllTime.filter(o => yearFromSec(o.closedWonDate) === selectedYear),
    [wonAllTime, selectedYear]);

  const openValue = openOpps.reduce((s, o) => s + num(o.quotedRevenue), 0);
  const likelyValue = openOpps.reduce((s, o) => s + num(o.quotedRevenue) * (PHASE_PROBABILITY[o.phase] ?? 0), 0);
  const wonValue = wonInYear.reduce((s, o) => s + num(o.quotedRevenue), 0);
  const avgDealSize = wonInYear.length > 0 ? wonValue / wonInYear.length : 0;
  const totalClosed = wonAllTime.length + lostAllTime.length;
  const winRate = totalClosed > 0 ? Math.round((wonAllTime.length / totalClosed) * 100) : null;

  const rentalRevenueYTD = useMemo(() => rentals
    .filter(r => r.phase === 'Closed - Completed' && yearFromSec(r.actualReturn || r.returnDue) === currentYear)
    .reduce((s, r) => s + num(r.totalRevenue), 0), [rentals]);

  const activeLeads = leads.filter(l => l.stage !== 'Disqualified' && l.stage !== 'Converted');
  const convertedLeads = leads.filter(l => l.stage === 'Converted');
  const disqualifiedLeads = leads.filter(l => l.stage === 'Disqualified');
  const terminalLeads = convertedLeads.length + disqualifiedLeads.length;
  const leadConversionRate = terminalLeads > 0 ? Math.round((convertedLeads.length / terminalLeads) * 100) : null;

  // Closed Won revenue by month (selected year), stacked by rep
  const closedByMonth = useMemo(() => {
    const months = new Set<string>();
    const byRepByMonth: Record<string, Record<string, number>> = {};
    wonInYear.forEach(o => {
      if (!o.closedWonDate) return;
      const key = monthKey(o.closedWonDate);
      const rep = o.accountManagerName || 'Unassigned';
      months.add(key);
      if (!byRepByMonth[rep]) byRepByMonth[rep] = {};
      byRepByMonth[rep][key] = (byRepByMonth[rep][key] || 0) + num(o.quotedRevenue);
    });
    const sortedMonths = Array.from(months).sort();
    const reps = Object.keys(byRepByMonth);
    return {
      labels: sortedMonths.map(monthLabel),
      datasets: reps.map((rep, i) => ({
        label: rep,
        data: sortedMonths.map(m => byRepByMonth[rep][m] || 0),
        backgroundColor: REP_COLORS[i % REP_COLORS.length],
        stack: 'closed',
      })),
    };
  }, [wonInYear]);

  // Open pipeline by close month — reported amount vs likely (weighted) amount
  const pipelineByMonth = useMemo(() => {
    const byMonth: Record<string, { amount: number; likely: number }> = {};
    openOpps.forEach(o => {
      const dateSec = o.closeDate || o.expectedDecision;
      if (!dateSec) return;
      const key = monthKey(dateSec);
      if (!byMonth[key]) byMonth[key] = { amount: 0, likely: 0 };
      byMonth[key].amount += num(o.quotedRevenue);
      byMonth[key].likely += num(o.quotedRevenue) * (PHASE_PROBABILITY[o.phase] ?? 0);
    });
    const sortedMonths = Object.keys(byMonth).sort();
    return {
      labels: sortedMonths.map(monthLabel),
      datasets: [
        {
          type: 'bar' as const,
          label: 'Likely Amount',
          data: sortedMonths.map(m => byMonth[m].likely),
          backgroundColor: '#27AE60',
        },
        {
          type: 'bar' as const,
          label: 'Reported Amount',
          data: sortedMonths.map(m => byMonth[m].amount),
          backgroundColor: '#4A90D9',
        },
      ],
    };
  }, [openOpps]);

  // Open opportunities by product family — Product Family is now open on every phase,
  // so all open opportunities are eligible; deals where a rep hasn't filled it in yet
  // still land in "Not yet assigned" (can happen at any open phase, not just Discovery).
  const byProductFamily = useMemo(() => {
    const counts: Record<string, number> = {};
    openOpps.forEach(o => {
      const family = o.productFamily || 'Not yet assigned';
      counts[family] = (counts[family] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]),
        borderWidth: 0,
      }],
    };
  }, [openOpps]);

  // Open opportunities by phase — fixed funnel order/colors so the chart stays
  // consistent regardless of which phases currently have deals.
  const byPhase = useMemo(() => {
    const counts: Record<string, number> = {};
    openOpps.forEach(o => {
      counts[o.phase] = (counts[o.phase] || 0) + 1;
    });
    const entries = OPEN_PHASES
      .map(phase => [phase, counts[phase] || 0] as [string, number])
      .filter(([, v]) => v > 0);
    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]),
        borderWidth: 0,
      }],
    };
  }, [openOpps]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { color: tickColor, boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { stacked: true, grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { stacked: true, grid: { color: gridColor }, ticks: { color: tickColor, callback: (v: number | string) => '€' + Number(v).toLocaleString() } },
    },
  };

  const comboOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { color: tickColor, boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v: number | string) => '€' + Number(v).toLocaleString() } },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' as const, labels: { color: tickColor, boxWidth: 12, font: { size: 11 } } } },
  };

  return (
    <Box>
      <Flex align="center" gap={3} mb={6}>
        <Text fontWeight="semibold" whiteSpace="nowrap">Year (Won Revenue):</Text>
        <Select maxW="180px" size="sm" value={selectedYear} onChange={e => onYearChange(e.target.value)}>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
      </Flex>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Funnel Snapshot</Heading>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="cyan.400">
          <Stat>
            <StatLabel>Active Leads</StatLabel>
            <StatNumber fontSize="2xl">{activeLeads.length}</StatNumber>
            <StatHelpText>Top of funnel</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="blue.400">
          <Stat>
            <StatLabel>Open Pipeline</StatLabel>
            <StatNumber fontSize="2xl">{fmtEUR(openValue)}</StatNumber>
            <StatHelpText>{openOpps.length} active opportunities</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="purple.400">
          <Stat>
            <StatLabel>Win Rate (all time)</StatLabel>
            <StatNumber fontSize="2xl">{winRate === null ? '—' : `${winRate}%`}</StatNumber>
            <StatHelpText>{wonAllTime.length} won / {totalClosed} closed</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
          borderTop="3px solid" borderTopColor="green.400">
          <Stat>
            <StatLabel>Won Revenue ({selectedYear})</StatLabel>
            <StatNumber fontSize="2xl">{fmtEUR(wonValue)}</StatNumber>
            <StatHelpText>{wonInYear.length} deal{wonInYear.length === 1 ? '' : 's'}</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} mb={8}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Avg Deal Size ({selectedYear})</StatLabel>
            <StatNumber fontSize="xl">{fmtEUR(avgDealSize)}</StatNumber>
          </Stat>
        </Box>
        <Tooltip label="Open pipeline value weighted by win probability per stage (Discovery 0% / Budgetary Review 10% / Proposal 30% / Negotiations 80%)." hasArrow>
          <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor} cursor="help">
            <Stat>
              <StatLabel>Likely Pipeline (weighted)</StatLabel>
              <StatNumber fontSize="xl">{fmtEUR(likelyValue)}</StatNumber>
              <StatHelpText>ⓘ Stage probabilities</StatHelpText>
            </Stat>
          </Box>
        </Tooltip>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Rental Revenue (YTD)</StatLabel>
            <StatNumber fontSize="xl" color={rentalRevenueYTD > 0 ? undefined : 'gray.400'}>{fmtEUR(rentalRevenueYTD)}</StatNumber>
          </Stat>
        </Box>
      </SimpleGrid>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Charts</Heading>
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} mb={4}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Heading size="xs" mb={3} color="gray.500">Open Opportunities by Phase</Heading>
          {byPhase.labels.length === 0
            ? <Text color="gray.500" fontSize="sm">No open opportunities.</Text>
            : <Box h="220px"><Doughnut data={byPhase} options={donutOptions} /></Box>}
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Heading size="xs" mb={3} color="gray.500">Open Opportunities by Product Family</Heading>
          {byProductFamily.labels.length === 0
            ? <Text color="gray.500" fontSize="sm">No open opportunities.</Text>
            : <Box h="220px"><Doughnut data={byProductFamily} options={donutOptions} /></Box>}
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Heading size="xs" mb={3} color="gray.500">Pipeline by Close Month — Reported vs Likely Amount</Heading>
          {pipelineByMonth.labels.length === 0
            ? <Text color="gray.500" fontSize="sm">No open opportunities with a close date or expected decision date set.</Text>
            : <Box h="220px"><Chart type="bar" data={pipelineByMonth} options={comboOptions} /></Box>}
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Heading size="xs" mb={3} color="gray.500">Closed Won Revenue by Month ({selectedYear})</Heading>
          {closedByMonth.labels.length === 0
            ? <Text color="gray.500" fontSize="sm">No won deals in this period.</Text>
            : <Box h="220px"><Chart type="bar" data={closedByMonth} options={barOptions} /></Box>}
        </Box>
      </SimpleGrid>

      <Heading size="sm" mb={3} mt={4} color="gray.500" textTransform="uppercase" letterSpacing="wide">Lead Conversion</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Total Leads</StatLabel><StatNumber fontSize="xl">{leads.length}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Converted</StatLabel><StatNumber fontSize="xl">{convertedLeads.length}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Conversion Rate</StatLabel>
            <StatNumber fontSize="xl">{leadConversionRate === null ? '—' : `${leadConversionRate}%`}</StatNumber>
            <StatHelpText>Of leads with a final outcome</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
