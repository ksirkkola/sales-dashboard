import { Button, HStack, Text, Tooltip } from '@chakra-ui/react';
import { useState } from 'react';
import type { HailerApi } from '@hailer/app-sdk';
import {
  CONTACT_FIELD, CONTACT_PHASE, CUSTOMER_FIELD, CUSTOMER_PHASE, LEADS_FIELD, LEADS_PHASE,
  OPP_FIELD, OPP_PHASE, WORKFLOW_CONTACT_PERSONS, WORKFLOW_CUSTOMERS, WORKFLOW_OPPORTUNITY,
  AKI_USER_ID,
} from '../constants/ids';
import { CUSTOMER_COUNTRY_OPTIONS, CUSTOMER_INDUSTRY_OPTIONS, OPP_PRODUCT_FAMILY_OPTIONS } from '../constants/dropdownOptions';
import type { LeadRow } from '../utils/leads';

interface Props {
  hailer: HailerApi;
  lead: LeadRow;
  onDone: () => void;
}

export default function LeadConvertActions({ hailer, lead, onDone }: Props) {
  const [busy, setBusy] = useState<'customer' | 'opportunity' | null>(null);

  const notify = (text: string) => {
    hailer.ui.snackbar.open(text, 'OK', 3500).catch(() => {});
  };

  async function handleConvertToCustomer() {
    setBusy('customer');
    try {
      const fields: Record<string, string> = {};
      if (lead.industry && CUSTOMER_INDUSTRY_OPTIONS.has(lead.industry)) fields[CUSTOMER_FIELD.industry] = lead.industry;
      if (lead.country && CUSTOMER_COUNTRY_OPTIONS.has(lead.country)) fields[CUSTOMER_FIELD.companyCountry] = lead.country;
      if (lead.assignedToId) fields[CUSTOMER_FIELD.accountManager] = lead.assignedToId;

      const customer = await hailer.ui.activity.create(WORKFLOW_CUSTOMERS, {
        name: lead.companyName || lead.name,
        phaseId: CUSTOMER_PHASE.all,
        fields,
      });

      if (!customer) { setBusy(null); return; } // rep cancelled the create panel

      // Follow up with a prefilled Contact Person, linked back to the new Customer
      if (lead.contactName && lead.contactName.trim()) {
        const parts = lead.contactName.trim().split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        const contactFields: Record<string, string> = { [CONTACT_FIELD.company]: customer._id };
        if (firstName) contactFields[CONTACT_FIELD.firstName] = firstName;
        if (lastName) contactFields[CONTACT_FIELD.lastName] = lastName;
        if (lead.email) contactFields[CONTACT_FIELD.email] = lead.email;
        if (lead.phone) contactFields[CONTACT_FIELD.phone] = lead.phone;
        if (lead.title) contactFields[CONTACT_FIELD.title] = lead.title;

        await hailer.ui.activity.create(WORKFLOW_CONTACT_PERSONS, {
          name: lead.contactName,
          phaseId: CONTACT_PHASE.all,
          fields: contactFields,
        });
      }

      // Only the general Leads workflow has a link-back field + Converted phase
      if (lead.sourceSystem === 'Leads') {
        await hailer.activity.update([
          { _id: lead.activityId, fields: { [LEADS_FIELD.convertedToCustomer]: customer._id }, phaseId: LEADS_PHASE.converted },
        ], {});
      }

      notify(`${lead.companyName || lead.name} converted to a Customer.`);
      onDone();
    } catch (err) {
      console.error('Convert to Customer failed:', err);
      notify("We couldn't finish converting this lead. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStartOpportunity() {
    if (!lead.convertedToCustomer) return;
    setBusy('opportunity');
    try {
      const fields: Record<string, string> = { [OPP_FIELD.leadInformation]: lead.convertedToCustomer };
      if (lead.productInterest && OPP_PRODUCT_FAMILY_OPTIONS.has(lead.productInterest)) {
        fields[OPP_FIELD.productFamily] = lead.productInterest;
      }

      const opp = await hailer.ui.activity.create(WORKFLOW_OPPORTUNITY, {
        name: `${lead.companyName || lead.name} - ${lead.productInterest || 'New Opportunity'}`,
        phaseId: OPP_PHASE.discovery,
        fields,
      });

      if (!opp) { setBusy(null); return; }

      // Native dialog doesn't take followerIds — add Aki right after creation.
      hailer.activity.update([{ _id: opp._id }], { followers: { [AKI_USER_ID]: true } }).catch(() => {});

      if (lead.sourceSystem === 'Leads') {
        await hailer.activity.update([
          { _id: lead.activityId, fields: { [LEADS_FIELD.convertedToOpportunity]: opp._id } },
        ], {});
      }

      notify('Opportunity created.');
      onDone();
    } catch (err) {
      console.error('Start Opportunity failed:', err);
      notify("We couldn't create the Opportunity. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (lead.stage === 'Disqualified') {
    return <Text fontSize="xs" color="subtleText">—</Text>;
  }

  if (lead.convertedToCustomer && lead.convertedToOpportunity) {
    return <Text fontSize="xs" color="green.500" fontWeight="medium">✓ Converted</Text>;
  }

  return (
    <HStack spacing={2}>
      {!lead.convertedToCustomer && (
        <Tooltip
          isDisabled={lead.sourceSystem === 'Leads'}
          label="This lead came from the Conference Lead Form — a Customer will be created, but this row can't be marked Converted (that workflow has no link-back field)."
          hasArrow
        >
          <Button size="xs" colorScheme="green" variant="outline" isLoading={busy === 'customer'} onClick={handleConvertToCustomer}>
            Convert to Customer
          </Button>
        </Tooltip>
      )}
      {lead.convertedToCustomer && !lead.convertedToOpportunity && (
        <Button size="xs" colorScheme="blue" variant="outline" isLoading={busy === 'opportunity'} onClick={handleStartOpportunity}>
          Start Opportunity
        </Button>
      )}
    </HStack>
  );
}
