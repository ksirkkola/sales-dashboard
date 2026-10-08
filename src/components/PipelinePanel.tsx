import {
  Badge, Box, Button, Divider, Flex, FormControl, FormLabel, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber,
  Table, Tbody, Td, Text, Th, Thead, Tr, Tooltip, useColorModeValue, useDisclosure, useToast, VStack,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import type { OpportunityRow } from '../utils/opportunities';
import { fmtEUR, fmtDateSec, num } from '../utils/insight';
import {
  OPP_FIELD, OPP_PHASE, OPP_PHASE_COLOR, WORKFLOW_OPPORTUNITY,
  WORKFLOW_CUSTOMERS, WORKFLOW_CONTACT_PERSONS, CUSTOMER_PHASE, CONTACT_PHASE,
} from '../constants/ids';
import { useApp } from '../hailer/use-app';
import SearchableSelect, { SelectOption } from './SearchableSelect';
import { PRODUCT_FAMILIES, getProductNamesForFamily } from '../utils/products';
import { createActivities } from '../hailer/employees';

const PRODUCT_CATEGORIZATIONS = ['Standard/Future Standard', 'Semi-Custom', 'Custom'];
const STARTUP_TYPES = ['Onsite Startup', 'Remote Startup', 'Agent Startup', 'No Startup'];
const todayStr = () => new Date().toISOString().slice(0, 10);

interface Props {
  hailer: HailerApi;
  opportunities: OpportunityRow[];
  onRefresh: () => void;
}

const OPEN_PHASES = ['Discovery', 'Budgetary Review', 'Proposal', 'Negotiations'];
const PHASE_ORDER: Record<string, number> = { Discovery: 0, 'Budgetary Review': 1, Proposal: 2, Negotiations: 3 };
const ALL_REPS = 'All Reps';

type SortKey = 'opportunityName' | 'accountName' | 'phase' | 'accountManagerName' | 'quotedRevenue' | 'expectedDecision' | 'nextFollowupDate';

// Overdue = the customer's own Expected Date to Decision has passed.
function isOverdue(o: OpportunityRow): boolean {
  return !!o.expectedDecision && o.expectedDecision * 1000 < Date.now();
}

// Follow-up due = the rep's own Next Followup Date reminder has passed — a separate,
// self-set chase cadence, independent of when the customer is expected to decide.
function isFollowupDue(o: OpportunityRow): boolean {
  return !!o.nextFollowupDate && o.nextFollowupDate * 1000 < Date.now();
}

export default function PipelinePanel({ hailer, opportunities, onRefresh }: Props) {
  const { user } = useApp();
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const cardBg = useColorModeValue('white', 'gray.700');
  const theadBg = useColorModeValue('gray.50', 'gray.800');
  const rowHover = useColorModeValue('gray.50', 'gray.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const { isOpen: isNewOppOpen, onOpen: onNewOppOpen, onClose: onNewOppClose } = useDisclosure();

  const [leadOptions, setLeadOptions] = useState<SelectOption[]>([]);
  const [leadOptionsLoading, setLeadOptionsLoading] = useState(false);
  const [leadOptionsLoaded, setLeadOptionsLoaded] = useState(false);

  const [newOpp, setNewOpp] = useState({
    name: '', leadId: '', productFamily: '', productName: '',
    productCategorization: '', startupType: 'Onsite Startup', initialLeadContact: todayStr(),
  });

  const [repFilter, setRepFilter] = useState<string>(ALL_REPS);
  const [repDefaultApplied, setRepDefaultApplied] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('expectedDecision');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Lead Information can point at either Customers or Contact Persons — load
  // both, lazily, only once the create modal is actually opened.
  async function ensureLeadOptionsLoaded() {
    if (leadOptionsLoaded || leadOptionsLoading) return;
    setLeadOptionsLoading(true);
    try {
      const [customers, contacts] = await Promise.all([
        hailer.activity.list(WORKFLOW_CUSTOMERS, CUSTOMER_PHASE.all, { limit: 200 }),
        hailer.activity.list(WORKFLOW_CONTACT_PERSONS, CONTACT_PHASE.all, { limit: 200 }),
      ]);
      const opts: SelectOption[] = [
        ...customers.map(c => ({ _id: c._id, name: c.name, badge: 'Customer' })),
        ...contacts.map(c => ({ _id: c._id, name: c.name, badge: 'Contact' })),
      ].sort((a, b) => a.name.localeCompare(b.name));
      setLeadOptions(opts);
      setLeadOptionsLoaded(true);
    } catch (err) {
      console.error('Loading lead options failed:', err);
      toast({ title: 'Could not load customers/contacts', description: String(err), status: 'error', duration: 4000 });
    }
    setLeadOptionsLoading(false);
  }

  function openNewOpportunity() {
    setNewOpp({
      name: '', leadId: '', productFamily: '', productName: '',
      productCategorization: '', startupType: 'Onsite Startup', initialLeadContact: todayStr(),
    });
    onNewOppOpen();
    void ensureLeadOptionsLoaded();
  }

  const productNameOptions = useMemo(
    () => newOpp.productFamily ? getProductNamesForFamily(newOpp.productFamily) : [],
    [newOpp.productFamily],
  );

  function handleFamilyChange(family: string) {
    setNewOpp(p => ({ ...p, productFamily: family, productName: '' }));
  }

  async function handleNewOpportunity() {
    if (!newOpp.name || !newOpp.leadId || !newOpp.productFamily || !newOpp.productName ||
        !newOpp.productCategorization || !newOpp.startupType || !newOpp.initialLeadContact) {
      toast({ title: 'Please fill in all required fields', status: 'warning', duration: 3000 });
      return;
    }
    setCreating(true);
    try {
      // Only the fields Hailer actually requires at creation (Lead Information,
      // Product Family, Product Name, Product Categorization, Startup Type,
      // Initial Lead Contact) — everything else can be filled in afterward by
      // opening the created activity. For a fully priced quote, the Product
      // Configurator app is the normal route instead (it builds the price
      // breakdown from the Price List and saves the finished quote here).
      //
      // Lead Information (a polymorphic ActivityLink — Customers OR Contact
      // Persons) writes as a plain id string, confirmed against the server's
      // own validation error ("must be a string"), not { _id, name }. Initial
      // Lead Contact is a date field and needs Unix milliseconds, not a
      // "YYYY-MM-DD" string.
      const created = await createActivities(hailer, WORKFLOW_OPPORTUNITY, [{
        name: newOpp.name,
        phaseId: OPP_PHASE.discovery,
        fields: {
          [OPP_FIELD.leadInformation]: newOpp.leadId,
          [OPP_FIELD.productFamily]: newOpp.productFamily,
          [OPP_FIELD.productName]: newOpp.productName,
          [OPP_FIELD.productCategorization]: newOpp.productCategorization,
          [OPP_FIELD.startupType]: newOpp.startupType,
          [OPP_FIELD.initialLeadContact]: new Date(newOpp.initialLeadContact).getTime(),
        },
      }]);
      if (created?.[0]?._id) {
        hailer.ui.snackbar.open('Opportunity created.', 'OK', 3000).catch(() => {});
        onNewOppClose();
        onRefresh();
      } else {
        throw new Error('Opportunity was not created — check Hailer before retrying.');
      }
    } catch (err) {
      console.error('Create opportunity failed:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const fieldErrors = e?.details && typeof e.details === 'object' ? Object.values(e.details).join('; ') : undefined;
      toast({
        title: "We couldn't create the opportunity",
        description: fieldErrors || e?.msg || String(err),
        status: 'error', duration: 6000, isClosable: true,
      });
    } finally {
      setCreating(false);
    }
  }

  const openOpps = useMemo(() => opportunities.filter(o => OPEN_PHASES.includes(o.phase)), [opportunities]);
  const wonOpps = useMemo(() => opportunities.filter(o => o.phase === 'Closed - Won'), [opportunities]);
  const lostOpps = useMemo(() => opportunities.filter(o => o.phase === 'Closed - Lost'), [opportunities]);

  // Rep list for the filter dropdown, built from every opportunity (any phase)
  // so a rep with only closed deals still shows up as a filter option.
  const reps = useMemo(() => {
    const set = new Set(opportunities.map(o => o.accountManagerName || 'Unassigned'));
    return [ALL_REPS, ...Array.from(set).sort()];
  }, [opportunities]);

  // Default the view to "my deals" — match by the current user's id against
  // accountManagerId first (robust), falling back to a name match if that
  // doesn't resolve. Only decided once, after data + user are both loaded,
  // so it doesn't fight a rep's manual filter choice on later refreshes.
  const myRepName = useMemo(() => {
    if (!user.current) return null;
    const byId = opportunities.find(o => o.accountManagerId === user.current!._id);
    if (byId) return byId.accountManagerName;
    const fullName = `${user.current.firstname} ${user.current.lastname}`.trim().toLowerCase();
    const byName = opportunities.find(o => (o.accountManagerName || '').toLowerCase() === fullName);
    return byName ? byName.accountManagerName : null;
  }, [opportunities, user.current]);

  useEffect(() => {
    if (repDefaultApplied) return;
    if (opportunities.length === 0 || !user.current) return;
    if (myRepName) setRepFilter(myRepName);
    setRepDefaultApplied(true);
  }, [opportunities.length, user.current, myRepName, repDefaultApplied]);

  const matchesRep = (o: OpportunityRow) => repFilter === ALL_REPS || (o.accountManagerName || 'Unassigned') === repFilter;
  const visibleOpenOpps = useMemo(() => openOpps.filter(matchesRep), [openOpps, repFilter]);
  const visibleWonOpps = useMemo(() => wonOpps.filter(matchesRep), [wonOpps, repFilter]);
  const visibleLostOpps = useMemo(() => lostOpps.filter(matchesRep), [lostOpps, repFilter]);

  const phaseCounts = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    OPEN_PHASES.forEach(p => { counts[p] = { count: 0, value: 0 }; });
    visibleOpenOpps.forEach(o => {
      counts[o.phase].count++;
      counts[o.phase].value += num(o.quotedRevenue);
    });
    return counts;
  }, [visibleOpenOpps]);

  const totalOpenValue = visibleOpenOpps.reduce((s, o) => s + num(o.quotedRevenue), 0);
  const totalClosed = visibleWonOpps.length + visibleLostOpps.length;
  const winRate = totalClosed > 0 ? Math.round((visibleWonOpps.length / totalClosed) * 100) : null;
  const overdueCount = visibleOpenOpps.filter(o => isOverdue(o) || isFollowupDue(o)).length;

  const lossReasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleLostOpps.forEach(o => {
      const reason = o.lossReason || 'Unknown';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [visibleLostOpps]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleOpenOpps;
    return visibleOpenOpps.filter(o =>
      o.opportunityName.toLowerCase().includes(q) || (o.accountName || '').toLowerCase().includes(q));
  }, [visibleOpenOpps, search]);

  const sortedOpenOpps = useMemo(() => {
    const rows = [...searched];
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'phase':
          av = PHASE_ORDER[a.phase] ?? 99;
          bv = PHASE_ORDER[b.phase] ?? 99;
          break;
        case 'quotedRevenue':
          av = num(a.quotedRevenue);
          bv = num(b.quotedRevenue);
          break;
        case 'expectedDecision':
          av = a.expectedDecision ?? Infinity;
          bv = b.expectedDecision ?? Infinity;
          break;
        case 'nextFollowupDate':
          av = a.nextFollowupDate ?? Infinity;
          bv = b.nextFollowupDate ?? Infinity;
          break;
        default:
          av = (a[sortKey] || '').toString().toLowerCase();
          bv = (b[sortKey] || '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [searched, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={1} wrap="wrap" gap={2}>
        <Heading size="sm" color="gray.500" textTransform="uppercase" letterSpacing="wide">Open Pipeline by Stage</Heading>
        <Tooltip label="Creates an Opportunity with just the required fields filled in (name, lead, product, categorization, startup type). For a priced quote, use the Product Configurator app instead — it builds the pricing and saves the finished quote as an Opportunity for you." hasArrow>
          <Button size="sm" variant="outline" colorScheme="gray" onClick={openNewOpportunity}>
            + Quick Opportunity
          </Button>
        </Tooltip>
      </Flex>
      <Text fontSize="xs" color={mutedText} mb={4}>
        For a priced quote, start from the <strong>Product Configurator</strong> app instead — it builds the price breakdown and saves the finished quote here automatically.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mb={6}>
        {OPEN_PHASES.map(phase => (
          <Box key={phase} p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}
            borderTop="3px solid" borderTopColor={`${OPP_PHASE_COLOR[phase]}.400`}>
            <Stat>
              <StatLabel>
                <Badge colorScheme={OPP_PHASE_COLOR[phase]}>{phase}</Badge>
              </StatLabel>
              <StatNumber fontSize="lg">{fmtEUR(phaseCounts[phase].value)}</StatNumber>
              <StatHelpText>{phaseCounts[phase].count} deal{phaseCounts[phase].count === 1 ? '' : 's'}</StatHelpText>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={6}>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Open Pipeline Value</StatLabel><StatNumber fontSize="lg">{fmtEUR(totalOpenValue)}</StatNumber></Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Open Deals</StatLabel><StatNumber fontSize="lg">{visibleOpenOpps.length}</StatNumber></Stat>
        </Box>
        <Tooltip label="Open deals whose Expected Date to Decision or Next Followup Date has already passed — worth a follow-up." hasArrow>
          <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px"
            borderColor={overdueCount > 0 ? 'red.300' : borderColor} cursor="help">
            <Stat>
              <StatLabel>Needs Attention</StatLabel>
              <StatNumber fontSize="lg" color={overdueCount > 0 ? 'red.500' : undefined}>{overdueCount}</StatNumber>
              <StatHelpText>Overdue decision or follow-up</StatHelpText>
            </Stat>
          </Box>
        </Tooltip>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Win Rate (all time)</StatLabel><StatNumber fontSize="lg">{winRate === null ? '—' : `${winRate}%`}</StatNumber>
            <StatHelpText>{visibleWonOpps.length} won / {totalClosed} closed</StatHelpText>
          </Stat>
        </Box>
        <Box p={4} bg={cardBg} borderRadius="md" shadow="sm" border="1px" borderColor={borderColor}>
          <Stat><StatLabel>Closed — Lost</StatLabel><StatNumber fontSize="lg">{visibleLostOpps.length}</StatNumber></Stat>
        </Box>
      </SimpleGrid>

      {/* Filters */}
      <Flex gap={3} mb={2} wrap="wrap" align="center">
        <Select maxW="220px" size="sm" value={repFilter} onChange={e => setRepFilter(e.target.value)}>
          {reps.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Input maxW="260px" size="sm" placeholder="Search opportunity or account…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </Flex>
      <Text fontSize="xs" color={mutedText} mb={4}>
        {repFilter === ALL_REPS
          ? 'Showing all reps\u2019 open deals.'
          : `Showing ${repFilter}\u2019s open deals.`}
      </Text>

      {/* Open pipeline table */}
      {sortedOpenOpps.length === 0 ? (
        <Text color="gray.500" mb={6}>No open opportunities match these filters.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md" mb={8}>
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr>
                <Th cursor="pointer" onClick={() => handleSort('opportunityName')} userSelect="none">Name{sortIndicator('opportunityName')}</Th>
                <Th cursor="pointer" onClick={() => handleSort('accountName')} userSelect="none">Account{sortIndicator('accountName')}</Th>
                <Th cursor="pointer" onClick={() => handleSort('phase')} userSelect="none">Stage{sortIndicator('phase')}</Th>
                <Th cursor="pointer" onClick={() => handleSort('accountManagerName')} userSelect="none">Rep{sortIndicator('accountManagerName')}</Th>
                <Th isNumeric cursor="pointer" onClick={() => handleSort('quotedRevenue')} userSelect="none">Quoted Revenue{sortIndicator('quotedRevenue')}</Th>
                <Th cursor="pointer" onClick={() => handleSort('expectedDecision')} userSelect="none">Expected Decision{sortIndicator('expectedDecision')}</Th>
                <Th cursor="pointer" onClick={() => handleSort('nextFollowupDate')} userSelect="none">Next Follow-up{sortIndicator('nextFollowupDate')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sortedOpenOpps.map(o => (
                <Tr key={o.activityId} _hover={{ bg: rowHover }} cursor="pointer"
                  onClick={() => hailer.ui.activity.open(o.activityId)}>
                  <Td fontWeight="medium" maxW="220px" isTruncated>{o.opportunityName}</Td>
                  <Td maxW="180px" isTruncated>{o.accountName || '—'}</Td>
                  <Td><Badge colorScheme={OPP_PHASE_COLOR[o.phase] || 'gray'}>{o.phase}</Badge></Td>
                  <Td fontSize="xs">{o.accountManagerName}</Td>
                  <Td isNumeric>{fmtEUR(o.quotedRevenue)}</Td>
                  <Td fontSize="xs">
                    <Flex align="center" gap={2}>
                      <Text>{fmtDateSec(o.expectedDecision)}</Text>
                      {isOverdue(o) && <Badge colorScheme="red">Overdue</Badge>}
                    </Flex>
                  </Td>
                  <Td fontSize="xs">
                    <Flex align="center" gap={2}>
                      <Text>{fmtDateSec(o.nextFollowupDate)}</Text>
                      {isFollowupDue(o) && <Badge colorScheme="red">Due</Badge>}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Divider mb={6} />

      {/* Loss reasons */}
      <Heading size="sm" mb={3} color="gray.500" textTransform="uppercase" letterSpacing="wide">Closed — Lost Breakdown</Heading>
      {lossReasonCounts.length === 0 ? (
        <Text color="gray.500">No lost opportunities.</Text>
      ) : (
        <Box overflowX="auto" border="1px" borderColor={borderColor} borderRadius="md">
          <Table variant="simple" size="sm">
            <Thead bg={theadBg}>
              <Tr><Th>Loss Reason</Th><Th isNumeric>Count</Th></Tr>
            </Thead>
            <Tbody>
              {lossReasonCounts.map(([reason, count]) => (
                <Tr key={reason}>
                  <Td>{reason}</Td>
                  <Td isNumeric>{count}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* New Opportunity Modal — only the fields Hailer requires at creation.
          Product Name is filtered to the chosen Product Family so there's no
          need to scroll through every product to find the right one. */}
      <Modal isOpen={isNewOppOpen} onClose={onNewOppClose} size="md" trapFocus={false} autoFocus={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Opportunity</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input value={newOpp.name} onChange={e => setNewOpp(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Company X - GHP System" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Lead Information</FormLabel>
                <SearchableSelect
                  value={newOpp.leadId || null}
                  onChange={id => setNewOpp(p => ({ ...p, leadId: id }))}
                  options={leadOptions}
                  placeholder={leadOptionsLoading ? 'Loading customers & contacts…' : 'Select customer or contact…'}
                  isDisabled={leadOptionsLoading}
                  allowClear
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Product Family</FormLabel>
                <Select placeholder="Select family…" value={newOpp.productFamily}
                  onChange={e => handleFamilyChange(e.target.value)}>
                  {PRODUCT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Product Name</FormLabel>
                <Select placeholder={newOpp.productFamily ? 'Select product…' : 'Pick a Product Family first'}
                  value={newOpp.productName} isDisabled={!newOpp.productFamily}
                  onChange={e => setNewOpp(p => ({ ...p, productName: e.target.value }))}>
                  {productNameOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Product Categorization</FormLabel>
                <Select placeholder="Select…" value={newOpp.productCategorization}
                  onChange={e => setNewOpp(p => ({ ...p, productCategorization: e.target.value }))}>
                  {PRODUCT_CATEGORIZATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Startup Type</FormLabel>
                <Select value={newOpp.startupType}
                  onChange={e => setNewOpp(p => ({ ...p, startupType: e.target.value }))}>
                  {STARTUP_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Initial Lead Contact</FormLabel>
                <Input type="date" value={newOpp.initialLeadContact}
                  onChange={e => setNewOpp(p => ({ ...p, initialLeadContact: e.target.value }))} />
              </FormControl>
              <Text fontSize="xs" color={mutedText} alignSelf="flex-start">
                Everything else (financials, dates, shipping, etc.) can be filled in by opening the
                opportunity after it's created.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewOppClose}>Cancel</Button>
            <Button colorScheme="blue" isLoading={creating} onClick={handleNewOpportunity}>Create Opportunity</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
