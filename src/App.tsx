import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Flex, Heading, Icon, Spinner, Tab, TabList, TabPanel, TabPanels, Tabs, Text,
  useColorMode, useColorModeValue,
} from '@chakra-ui/react';
import { useApp } from './hailer/use-app';
import { useRefresh } from './hailer/use-refresh';
import { HailerActivities } from './hailer/theme/icons/HailerActivities';
import { HailerFeed } from './hailer/theme/icons/HailerFeed';
import { HailerAddUser } from './hailer/theme/icons/HailerAddUser';
import { HailerPayment } from './hailer/theme/icons/HailerPayment';
import { HailerCalendar } from './hailer/theme/icons/HailerCalendar';
import { HailerInfo } from './hailer/theme/icons/HailerInfo';
import OverviewPanel from './components/OverviewPanel';
import LeadsPanel from './components/LeadsPanel';
import PipelinePanel from './components/PipelinePanel';
import RevenuePanel from './components/RevenuePanel';
import RentalsPanel from './components/RentalsPanel';
import ReferencePanel from './components/ReferencePanel';
import { loadLeads, type LeadRow } from './utils/leads';
import { loadOpportunities, type OpportunityRow } from './utils/opportunities';
import { loadRentals, loadFleet, type RentalRow, type FleetUnitRow } from './utils/rentals';
import { yearFromSec } from './utils/insight';

const ALL_YEARS = 'All Years';
const currentYear = new Date().getFullYear().toString();

export default function App() {
  const { hailer, api, inside, event, settings } = useApp();
  const { setColorMode } = useColorMode();
  const { refreshKey, refresh, fmtLastUpdated } = useRefresh();
  const mutedText = useColorModeValue('gray.500', 'gray.400');

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [rentals, setRentals] = useState<RentalRow[]>([]);
  const [fleet, setFleet] = useState<FleetUnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    void api.init();
    event.on('activity.create', refresh);
    event.on('activity.update', refresh);
    return () => {
      event.off('activity.create', refresh);
      event.off('activity.update', refresh);
    };
  }, [api, event, refresh]);

  useEffect(() => {
    if (settings) setColorMode(settings.theme === 'dark' ? 'dark' : 'light');
  }, [settings, setColorMode]);

  useEffect(() => {
    if (!inside || !hailer) return;
    setLoading(true);
    setError(null);
    Promise.all([loadLeads(hailer), loadOpportunities(hailer), loadRentals(hailer), loadFleet(hailer)])
      .then(([leadRows, oppRows, rentalRows, fleetRows]) => {
        setLeads(leadRows);
        setOpportunities(oppRows);
        setRentals(rentalRows);
        setFleet(fleetRows);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load Sales Dashboard data:', err);
        setError(String(err));
        setLoading(false);
      });
  }, [inside, hailer, refreshKey]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    opportunities.forEach(o => {
      if (o.phase === 'Closed - Won') {
        const y = yearFromSec(o.closedWonDate);
        if (y !== 'Unknown') years.add(y);
      }
    });
    return [ALL_YEARS, ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [opportunities]);

  return (
    <Box p="1.5em" maxW="1400px" mx="auto">
      {inside === null && (
        <Flex justify="center" align="center" h="200px">
          <Heading fontSize="lg" color="subtleText">Connecting to Hailer</Heading>
        </Flex>
      )}

      {inside === false && (
        <Box m="2em">
          <Heading fontSize="lg" color="subtleText" mb={2}>You are outside of Hailer</Heading>
          <Text fontSize="sm" color="subtleText">Open this app inside your Hailer workspace to see the Sales Dashboard.</Text>
        </Box>
      )}

      {inside && (
        <>
          <Flex align="flex-start" justify="space-between" mb={1} wrap="wrap" gap={2}>
            <Heading size="lg">📈 Sales Dashboard</Heading>
            <Flex align="center" gap={3}>
              <Text fontSize="xs" color={mutedText}>Updated {fmtLastUpdated()}</Text>
              <Button size="sm" variant="outline" isLoading={loading} onClick={refresh}>↻ Refresh</Button>
            </Flex>
          </Flex>
          <Text fontSize="sm" color="subtleText" mb={6}>
            Lead funnel, pipeline, win rate, and revenue — across 🧲 Leads and the Conference Lead Form.
          </Text>

          {loading && leads.length === 0 && opportunities.length === 0 ? (
            <Flex justify="center" align="center" h="240px"><Spinner size="xl" /></Flex>
          ) : error ? (
            <Text color="red.500">Error loading data: {error}</Text>
          ) : (
            <Tabs variant="hailer" isLazy>
              <TabList>
                <Tab><Icon marginRight="0.3em" as={HailerInfo} />Reference</Tab>
                <Tab><Icon marginRight="0.3em" as={HailerFeed} />Overview</Tab>
                <Tab><Icon marginRight="0.3em" as={HailerAddUser} />Leads</Tab>
                <Tab><Icon marginRight="0.3em" as={HailerActivities} />Pipeline</Tab>
                <Tab><Icon marginRight="0.3em" as={HailerCalendar} />Rentals</Tab>
                <Tab><Icon marginRight="0.3em" as={HailerPayment} />Won &amp; Revenue</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <ReferencePanel leads={leads} opportunities={opportunities} />
                </TabPanel>
                <TabPanel px={0}>
                  <OverviewPanel
                    leads={leads}
                    opportunities={opportunities}
                    rentals={rentals}
                    selectedYear={selectedYear}
                    availableYears={availableYears}
                    onYearChange={setSelectedYear}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <LeadsPanel hailer={hailer!} leads={leads} onRefresh={refresh} />
                </TabPanel>
                <TabPanel px={0}>
                  <PipelinePanel hailer={hailer!} opportunities={opportunities} onRefresh={refresh} />
                </TabPanel>
                <TabPanel px={0}>
                  <RentalsPanel hailer={hailer!} rentals={rentals} fleet={fleet} selectedYear={selectedYear} onRefresh={refresh} />
                </TabPanel>
                <TabPanel px={0}>
                  <RevenuePanel hailer={hailer!} opportunities={opportunities} selectedYear={selectedYear} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </>
      )}
    </Box>
  );
}
