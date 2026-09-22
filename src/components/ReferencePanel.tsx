import {
  Box, Heading, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td, Text, Badge,
  useColorModeValue, Divider,
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { useApp } from '../hailer/use-app';
import type { LeadRow } from '../utils/leads';
import type { OpportunityRow } from '../utils/opportunities';
import { STAGE_COLOR, OPP_PHASE_COLOR, RENTAL_PHASE_COLOR } from '../constants/ids';

interface Props {
  leads: LeadRow[];
  opportunities: OpportunityRow[];
}

interface PhaseInfo { phase: string; description: string }

const LEAD_STAGES: PhaseInfo[] = [
  { phase: 'New', description: 'Just came in — not yet worked.' },
  { phase: 'Contacted', description: 'First outreach made — waiting on a response or next step.' },
  { phase: 'Qualified', description: 'Confirmed as a real opportunity — ready to convert to an Opportunity/Customer.' },
  { phase: 'Converted', description: 'Turned into a Customer + Opportunity. Counted as a funnel win.' },
  { phase: 'Disqualified', description: "Not a fit — see Disqualified Reason on the lead for why." },
];

const OPP_PHASES: PhaseInfo[] = [
  { phase: 'Discovery', description: 'Early-stage — understanding the need. Also where the PRF process happens. 0% win probability in forecasts.' },
  { phase: 'Budgetary Review', description: 'Customer is checking budget/approval. 10% win probability.' },
  { phase: 'Proposal', description: 'A formal quote is out. 30% win probability.' },
  { phase: 'Negotiations', description: 'Terms being finalized — closest to closing. 80% win probability.' },
  { phase: 'Closed - Won', description: 'Deal won — counts toward Won Revenue and the Rep Leaderboard.' },
  { phase: 'Closed - Lost', description: 'Deal lost — see Loss Reason for why; feeds the Loss Breakdown chart.' },
];

const RENTAL_PHASES: PhaseInfo[] = [
  { phase: 'Discovery', description: 'Rental request just came in — not yet quoted.' },
  { phase: 'Proposal', description: 'Rate/terms quoted to the customer.' },
  { phase: 'Agreement', description: 'Customer agreed — preparing for delivery/pickup.' },
  { phase: 'Out on Rental', description: 'Unit is with the customer — Return Due date is the one to watch.' },
  { phase: 'Returned', description: 'Unit is back — being checked for condition/damage before closing.' },
  { phase: 'Closed - Completed', description: 'Rental finished normally — counts toward Rental Revenue.' },
  { phase: 'Closed - Lost', description: 'Rental fell through before completion.' },
];

const TERMS: { term: string; description: string }[] = [
  { term: 'Quoted Revenue', description: 'The total price quoted to the customer for this opportunity.' },
  { term: 'PO Amount', description: "The customer's actual Purchase Order value — may differ slightly from Quoted Revenue." },
  { term: 'Account Manager / Rep', description: 'The internal rep who owns the account — shown as "Rep" on the Pipeline tab.' },
  { term: 'Agent', description: 'A third-party reseller/referrer on the deal — separate from the internal Account Manager.' },
  { term: 'Commission Amount', description: 'What gets paid out to an Agent for a deal closed through them.' },
  { term: 'Product Family', description: "The equipment/product category on a deal. Shows as \"Not yet assigned\" until a rep fills it in — that can happen at any open stage, not just Discovery." },
  { term: 'Loss Reason', description: 'Why a deal was marked Closed - Lost. Drives the Loss Breakdown chart on the Pipeline tab.' },
  { term: 'Expected Date to Decision', description: "The customer's own timeline for deciding. If this date passes while still open, the deal shows as Overdue." },
  { term: 'Next Followup Date', description: "Your own reminder to check back in — separate from the customer's Expected Date to Decision. Triggers a Hailer notification on the day it's due." },
  { term: 'Win Rate', description: 'Won ÷ (Won + Lost), among deals that reached a final outcome.' },
  { term: 'Likely Pipeline (weighted)', description: 'Open pipeline value weighted by each phase\u2019s win probability (see Opportunity phases above).' },
  { term: 'Weekly Rate / Deposit / Damage Charges', description: 'Rental billing terms — rate charged per week, refundable deposit taken upfront, and any charges deducted for damage found on return.' },
];

const OPEN_LEAD_STAGES = ['New', 'Contacted', 'Qualified'];
const OPEN_OPP_PHASES = ['Discovery', 'Budgetary Review', 'Proposal', 'Negotiations'];

interface DirectoryRow { id: string; leads: number; opportunities: number }

export default function ReferencePanel({ leads, opportunities }: Props) {
  const { user } = useApp();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const theadBg = useColorModeValue('gray.50', 'gray.800');
  const mutedText = useColorModeValue('gray.500', 'gray.400');

  const directory = useMemo(() => {
    const counts: Record<string, DirectoryRow> = {};
    function bump(id: string | null | undefined, key: 'leads' | 'opportunities') {
      if (!id) return;
      if (!counts[id]) counts[id] = { id, leads: 0, opportunities: 0 };
      counts[id][key]++;
    }
    leads.filter(l => OPEN_LEAD_STAGES.includes(l.stage)).forEach(l => bump(l.assignedToId, 'leads'));
    opportunities.filter(o => OPEN_OPP_PHASES.includes(o.phase)).forEach(o => bump(o.accountManagerId, 'opportunities'));
    return Object.values(counts).sort((a, b) => (b.leads + b.opportunities) - (a.leads + a.opportunities));
  }, [leads, opportunities]);

  function userName(id: string): string {
    const u = user.map[id];
    return u ? `${u.firstname} ${u.lastname}` : id;
  }

  function PhaseTable({ title, phases, colors }: { title: string; phases: PhaseInfo[]; colors: Record<string, string> }) {
    return (
      <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
        <Heading size="sm" mb={3}>{title}</Heading>
        <Table variant="simple" size="sm">
          <Tbody>
            {phases.map(p => (
              <Tr key={p.phase}>
                <Td whiteSpace="nowrap" verticalAlign="top">
                  <Badge colorScheme={colors[p.phase] || 'gray'}>{p.phase}</Badge>
                </Td>
                <Td fontSize="sm" color={mutedText}>{p.description}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" color={mutedText} mb={5}>
        New here? This is a quick reference for what the phases and terms mean across Leads, Pipeline (Opportunities),
        and Rentals, plus who else is on the team right now.
      </Text>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Phase Glossary</Heading>
      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4} mb={6}>
        <PhaseTable title="Leads" phases={LEAD_STAGES} colors={STAGE_COLOR} />
        <PhaseTable title="Pipeline (Opportunities)" phases={OPP_PHASES} colors={OPP_PHASE_COLOR} />
        <PhaseTable title="Rentals" phases={RENTAL_PHASES} colors={RENTAL_PHASE_COLOR} />
      </SimpleGrid>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Terms You'll See</Heading>
      <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor} mb={6}>
        <Table variant="simple" size="sm">
          <Tbody>
            {TERMS.map(t => (
              <Tr key={t.term}>
                <Td whiteSpace="nowrap" fontWeight="semibold" verticalAlign="top">{t.term}</Td>
                <Td fontSize="sm" color={mutedText}>{t.description}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Who's on Sales Right Now</Heading>
      <Text fontSize="xs" color={mutedText} mb={3}>
        Built from currently open work — not a fixed org chart. This workspace doesn't have a specific escalation
        contact configured; if you're stuck, ask your manager or reach out to anyone below.
      </Text>
      {directory.length === 0 ? (
        <Text color={mutedText}>No open leads or deals are currently assigned to anyone.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th>Name</Th>
                <Th isNumeric>Open Leads</Th>
                <Th isNumeric>Open Deals</Th>
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {directory.map(d => (
                <Tr key={d.id} fontWeight={d.id === user.current?._id ? 'bold' : 'normal'}>
                  <Td>{userName(d.id)}{d.id === user.current?._id ? ' (you)' : ''}</Td>
                  <Td isNumeric>{d.leads}</Td>
                  <Td isNumeric>{d.opportunities}</Td>
                  <Td isNumeric fontWeight="bold">{d.leads + d.opportunities}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Divider mt={6} mb={4} />
      <Text fontSize="xs" color={mutedText}>
        Tip: the Pipeline tab's Rep filter defaults to showing just your own deals — switch it to "All Reps"
        any time you want the full team view.
      </Text>
    </Box>
  );
}
