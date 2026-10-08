import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel,
  Badge, Box, Button, Flex, Heading, Select, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import type { LeadRow } from '../utils/leads';
import { fmtEUR, fmtDateSec } from '../utils/insight';
import { LEADS_PHASE, STAGE_COLOR, WORKFLOW_LEADS, LEAD_FOLLOWER_IDS } from '../constants/ids';
import { HailerPlus } from '../hailer/theme/icons/HailerPlus';
import LeadConvertActions from './LeadConvertActions';
import SortableTh, { SortDirection } from './SortableTh';
import { createActivityViaDialog } from '../hailer/employees';

type SortField = 'company' | 'contact' | 'source' | 'stage' | 'rep' | 'value' | 'followup' | 'created';

function sortValue(l: LeadRow, field: SortField): string | number {
  switch (field) {
    case 'company': return (l.companyName || l.name).toLowerCase();
    case 'contact': return (l.contactName || '').toLowerCase();
    case 'source': return l.leadSource.toLowerCase();
    case 'stage': return l.stage.toLowerCase();
    case 'rep': return (l.assignedToName || '').toLowerCase();
    case 'value': return l.estimatedValue ?? -1;
    case 'followup': return l.nextFollowupDate ?? -1;
    case 'created': return l.created;
    default: return '';
  }
}

interface Props {
  hailer: HailerApi;
  leads: LeadRow[];
  onRefresh: () => void;
}

interface HeadProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function LeadsTableHead({ sortField, sortDirection, onSort }: HeadProps) {
  return (
    <Tr>
      <SortableTh field="company" label="Company" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <SortableTh field="contact" label="Contact" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <SortableTh field="source" label="Source" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <SortableTh field="stage" label="Stage" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <SortableTh field="rep" label="Rep" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <SortableTh field="value" label="Est. Value" activeField={sortField} direction={sortDirection} onSort={onSort} isNumeric />
      <SortableTh field="followup" label="Next Follow-up" activeField={sortField} direction={sortDirection} onSort={onSort} />
      <Th>Action</Th>
    </Tr>
  );
}

interface RowsProps {
  rows: LeadRow[];
  hailer: HailerApi;
  onRefresh: () => void;
  rowHover: string;
}

function LeadsTableRows({ rows, hailer, onRefresh, rowHover }: RowsProps) {
  return (
    <>
      {rows.map(l => (
        <Tr key={l.activityId} _hover={{ bg: rowHover }}>
          <Td fontWeight="medium" maxW="200px" isTruncated cursor="pointer"
            onClick={() => hailer.ui.activity.open(l.activityId)}>
            {l.companyName || l.name}
          </Td>
          <Td maxW="150px" isTruncated>{l.contactName || '—'}</Td>
          <Td><Badge colorScheme={l.sourceSystem === 'Conference' ? 'teal' : 'blue'}>{l.leadSource}</Badge></Td>
          <Td><Badge colorScheme={STAGE_COLOR[l.stage] || 'gray'}>{l.stage}</Badge></Td>
          <Td fontSize="xs">{l.assignedToName}</Td>
          <Td isNumeric>{fmtEUR(l.estimatedValue)}</Td>
          <Td fontSize="xs">
            <Flex align="center" gap={2}>
              <Text>{fmtDateSec(l.nextFollowupDate)}</Text>
              {isFollowupDue(l) && <Badge colorScheme="red">Due</Badge>}
            </Flex>
          </Td>
          <Td>
            <LeadConvertActions hailer={hailer} lead={l} onDone={onRefresh} />
          </Td>
        </Tr>
      ))}
    </>
  );
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Converted', 'Disqualified'];
const ALL = 'All';
const ACTIVE_STAGES = ['New', 'Contacted', 'Qualified'];

function isFollowupDue(l: LeadRow): boolean {
  return ACTIVE_STAGES.includes(l.stage) && !!l.nextFollowupDate && l.nextFollowupDate * 1000 < Date.now();
}

export default function LeadsPanel({ hailer, leads, onRefresh }: Props) {
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [stageFilter, setStageFilter] = useState(ALL);
  const [repFilter, setRepFilter] = useState(ALL);
  const [creating, setCreating] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.700');
  const theadBg = useColorModeValue('gray.50', 'gray.800');
  const rowHover = useColorModeValue('gray.50', 'gray.600');

  async function handleNewLead() {
    setCreating(true);
    try {
      // Leads go to Kristin and Aki only (the native dialog can't take followerIds).
      const created = await createActivityViaDialog(hailer, WORKFLOW_LEADS, { phaseId: LEADS_PHASE.new }, LEAD_FOLLOWER_IDS);
      if (created) {
        hailer.ui.snackbar.open('Lead created.', 'OK', 3000).catch(() => {});
        onRefresh();
      }
    } catch (err) {
      console.error('Create lead failed:', err);
      hailer.ui.snackbar.open("We couldn't create the lead. Please try again.", 'OK', 4000).catch(() => {});
    } finally {
      setCreating(false);
    }
  }

  const reps = useMemo(() => {
    const set = new Set(leads.map(l => l.assignedToName || 'Unassigned'));
    return [ALL, ...Array.from(set).sort()];
  }, [leads]);

  const filtered = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return leads
      .filter(l =>
        (sourceFilter === ALL || l.sourceSystem === sourceFilter) &&
        (stageFilter === ALL || l.stage === stageFilter) &&
        (repFilter === ALL || (l.assignedToName || 'Unassigned') === repFilter)
      )
      .sort((a, b) => {
        const av = sortValue(a, sortField);
        const bv = sortValue(b, sortField);
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
  }, [leads, sourceFilter, stageFilter, repFilter, sortField, sortDirection]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    leads.forEach(l => { counts[l.stage] = (counts[l.stage] || 0) + 1; });
    return counts;
  }, [leads]);

  const activeRows = useMemo(
    () => filtered.filter(l => l.stage !== 'Converted' && l.stage !== 'Disqualified'),
    [filtered],
  );
  const terminalRows = useMemo(
    () => filtered.filter(l => l.stage === 'Converted' || l.stage === 'Disqualified'),
    [filtered],
  );

  const activeCount = leads.filter(l => l.stage !== 'Disqualified' && l.stage !== 'Converted').length;
  const convertedCount = stageCounts.Converted || 0;
  const disqualifiedCount = stageCounts.Disqualified || 0;
  const totalTerminal = convertedCount + disqualifiedCount;
  const conversionRate = totalTerminal > 0 ? Math.round((convertedCount / totalTerminal) * 100) : null;
  const followupsDue = leads.filter(isFollowupDue).length;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="sm" color="gray.500" textTransform="uppercase" letterSpacing="wide">Lead Funnel</Heading>
        <Button size="sm" colorScheme="green" leftIcon={<HailerPlus />} isLoading={creating} onClick={handleNewLead}>
          New Lead
        </Button>
      </Flex>

      {/* Funnel summary */}
      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={6}>
        {STAGES.map(stage => (
          <Box key={stage} p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
            borderTop="3px solid" borderTopColor={`${STAGE_COLOR[stage]}.400`}>
            <Stat>
              <StatLabel>{stage}</StatLabel>
              <StatNumber>{stageCounts[stage] || 0}</StatNumber>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Active Leads</StatLabel>
            <StatNumber>{activeCount}</StatNumber>
            <StatHelpText>Not yet converted or disqualified</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px"
          borderColor={followupsDue > 0 ? 'red.300' : borderColor}>
          <Stat>
            <StatLabel>Follow-ups Due</StatLabel>
            <StatNumber color={followupsDue > 0 ? 'red.500' : undefined}>{followupsDue}</StatNumber>
            <StatHelpText>Next Followup Date has passed</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Lead → Converted Rate</StatLabel>
            <StatNumber>{conversionRate === null ? '—' : `${conversionRate}%`}</StatNumber>
            <StatHelpText>Of leads that reached a final outcome</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat>
            <StatLabel>Total Leads (all time)</StatLabel>
            <StatNumber>{leads.length}</StatNumber>
            <StatHelpText>🧲 Leads + Conference Lead Form</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Filters */}
      <Flex gap={3} mb={4} wrap="wrap">
        <Select maxW="200px" size="sm" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value={ALL}>All Sources</option>
          <option value="Leads">General Leads</option>
          <option value="Conference">Conference</option>
        </Select>
        <Select maxW="200px" size="sm" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value={ALL}>All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select maxW="200px" size="sm" value={repFilter} onChange={e => setRepFilter(e.target.value)}>
          {reps.map(r => <option key={r} value={r}>{r === ALL ? 'All Reps' : r}</option>)}
        </Select>
      </Flex>

      {activeRows.length === 0 && terminalRows.length === 0 ? (
        <Text color="gray.500">No leads match these filters.</Text>
      ) : (
        <>
          {activeRows.length === 0 ? (
            <Text color="gray.500" mb={4}>No active leads match these filters.</Text>
          ) : (
            <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md" mb={terminalRows.length > 0 ? 4 : 0}>
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <LeadsTableHead sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                </Thead>
                <Tbody>
                  <LeadsTableRows rows={activeRows} hailer={hailer} onRefresh={onRefresh} rowHover={rowHover} />
                </Tbody>
              </Table>
            </Box>
          )}

          {terminalRows.length > 0 && (
            <Accordion allowToggle>
              <AccordionItem border="1px" borderColor={borderColor} borderRadius="md">
                <AccordionButton>
                  <Box flex="1" textAlign="left" fontSize="sm" fontWeight="medium">
                    Converted / Disqualified ({terminalRows.length})
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
                    <Table variant="simple" size="sm">
                      <Thead bg={theadBg}>
                        <LeadsTableHead sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      </Thead>
                      <Tbody>
                        <LeadsTableRows rows={terminalRows} hailer={hailer} onRefresh={onRefresh} rowHover={rowHover} />
                      </Tbody>
                    </Table>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </>
      )}
    </Box>
  );
}
