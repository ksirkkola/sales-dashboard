// Workflow IDs
export const WORKFLOW_LEADS = '6a993147bf732d175475356a';
export const WORKFLOW_CONFERENCE_LEAD = '6a1940934aa20b6663634f4e';
export const WORKFLOW_OPPORTUNITY = '6a041734fc4db70b8339a63e';
export const WORKFLOW_CUSTOMERS = '6a041d0ffc4db70b8339c891';
export const WORKFLOW_CONTACT_PERSONS = '6a041d0ffc4db70b8339c89a';

// Saved insight IDs
export const INSIGHT_LEADS_COMBINED = '6a99343ba8ea879e7060e3ce';
export const INSIGHT_OPPORTUNITIES = '6a99343ba8ea879e7060e3d0';
export const INSIGHT_RENTALS = '6a9944a52452ee1eeccdd47a';
export const INSIGHT_RENTAL_FLEET = '6a9944a52452ee1eeccdd47f';

// Rentals / Rental Fleet workflows
export const WORKFLOW_RENTALS = '6a99429b65a81755cf3190cf';
export const WORKFLOW_RENTAL_FLEET = '6a99429d65a81755cf3190e9';

export const RENTALS_PHASE = {
  discovery: '6a99429b65a81755cf3190ce',
  proposal: '6a9942c4b07fcca73bae450d',
  agreement: '6a9942c6b07fcca73bae4529',
  outOnRental: '6a9942c8b07fcca73bae4549',
  returned: '6a9942cab07fcca73bae456a',
  closedCompleted: '6a9942cdb07fcca73bae458c',
  closedLost: '6a9942cfb07fcca73bae45a3',
};

export const RENTAL_FLEET_PHASE = { all: '6a99429d65a81755cf3190e5' };

export const RENTAL_PHASE_COLOR: Record<string, string> = {
  Discovery: 'blue',
  Proposal: 'orange',
  Agreement: 'yellow',
  'Out on Rental': 'purple',
  Returned: 'cyan',
  'Closed - Completed': 'green',
  'Closed - Lost': 'gray',
};

export const FLEET_STATUS_COLOR: Record<string, string> = {
  Available: 'green',
  'On Rental': 'purple',
  'In Demo': 'blue',
  'In Repair/Inspection': 'orange',
  Retired: 'gray',
};

export const RENTALS_FIELD_DELIVERY_TRIP = '6a9946bd2452ee1eeccde937';

// TRIPS / IHS — used for scheduling delivery/setup/training trips off a Rental
export const WORKFLOW_TRIPS_IHS = '6a211715b129621437c16b03';
export const TRIPS_IHS_PHASE_TRIAGE = '6a211716b129621437c16b0e';
export const TRIPS_IHS_FIELD = {
  customer: '6a211716b129621437c16b16',
  asset: '6a211716b129621437c16b23',
  purposeForOnsiteTrip: '6a211716b129621437c16b2b',
  serviceType: '6a325f05506c8ccc619b0dbb',
};

// 🧲 Leads fields
export const LEADS_FIELD = {
  companyName: '6a9931ab810e6ffa37f4829e',
  contactName: '6a9931ab810e6ffa37f482a1',
  title: '6a9931ab810e6ffa37f482a4',
  email: '6a9931ab810e6ffa37f482a7',
  phone: '6a9931ab810e6ffa37f482ab',
  leadSource: '6a9931ab810e6ffa37f482af',
  industry: '6a9931ab810e6ffa37f482b3',
  country: '6a9931ac810e6ffa37f482b7',
  productInterest: '6a9931ac810e6ffa37f482bc',
  estimatedValue: '6a9931ac810e6ffa37f482c0',
  assignedTo: '6a9931ac810e6ffa37f482c3',
  notes: '6a9931ac810e6ffa37f482c7',
  convertedToCustomer: '6a9931ac810e6ffa37f482cb',
  convertedToOpportunity: '6a9931ac810e6ffa37f482d0',
  disqualifiedReason: '6a9931ac810e6ffa37f482d3',
};

// 🧲 Leads phases
export const LEADS_PHASE = {
  new: '6a993147bf732d1754753569',
  contacted: '6a9931622452ee1eecccdf0c',
  qualified: '6a9931642452ee1eecccdf22',
  converted: '6a9931672452ee1eecccdf57',
  disqualified: '6a9931692452ee1eecccdf73',
};

// ConferenceLead fields (specialized lead-capture workflow fed by the Conference Lead Form app)
export const CLEAD_FIELD = {
  email: '6a1940f162ed800822c37c85',
  company: '6a1940f162ed800822c37c88',
  industry: '6a1940f162ed800822c37c8c',
  productFamily: '6a1940f262ed800822c37c93',
  buyingStage: '6a1940f262ed800822c37c96',
  conference: '6a1940f262ed800822c37c99',
  notes: '6a1940f262ed800822c37c9f',
  firstName: '6a1973c6e48a5ad6a5429e1a',
  lastName: '6a1973c6e48a5ad6a5429e1e',
  assignedTo: '6a22c59e9167198b677c2882',
};

// ConferenceLead phases
export const CLEAD_PHASE = {
  newLead: '6a1940934aa20b6663634f4d',
  contacted: '6a1940be0dd73026883baa6e',
  qualified: '6a1940c00dd73026883baa88',
  disqualified: '6a1940c20dd73026883baaa2',
};

// Opportunity fields
export const OPP_FIELD = {
  leadInformation: '6a045b3869ca0986f1f788ba',
  agent: '6a8d1dc9cac73beca6b4caca',
  productFamily: '6a04622d69ca0986f1f7be3f',
  productName: '6a04622d69ca0986f1f7be45',
  productCategorization: '6a0469a969ca0986f1f804f7',
  startupType: '6a046ae369ca0986f1f80ebc',
  quotedTotalRevenue: '6a046ec269ca0986f1f83ab5',
  poAmount: '6a0d82c99de2da90175a95b4',
  initialLeadContact: '6a0d6df59de2da901759fcc5',
  closeDate: '6a04608169ca0986f1f7adb4',
  closedWonDate: '6a0d72889de2da90175a2215',
  closedLostDate: '6a0d72669de2da90175a2101',
  lossReason: '6a0d72119de2da90175a1ee6',
  expectedDecision: '6a06c887112c3668ef860708',
  commissionAmount: '6a43a19a3eb603adc29a6119',
  finalDestinationCountry: '6a8d1dcacac73beca6b4cad0',
};

// Opportunity phases
export const OPP_PHASE = {
  discovery: '6a041734fc4db70b8339a639',
  budgetaryReview: '6a9a78c320b2c43481f739cf',
  proposal: '6a0428a8fc4db70b833a3aa6',
  negotiations: '6a04292cfc4db70b833a3eb1',
  closedWon: '6a044d3669ca0986f1f70dc0',
  closedLost: '6a044dad69ca0986f1f710ee',
};

// Customers fields
export const CUSTOMER_FIELD = {
  companyCity: '6a041d0ffc4db70b8339c897',
  companyCountry: '6a3cbc95c15e261f4512e9a0',
  industry: '6a06d294112c3668ef8652af',
  accountManager: '6a322ad98f00066aecde8b90',
  isAgentClient: '6a06d26a112c3668ef8650eb',
};

// Customers phase (single-phase dataset)
export const CUSTOMER_PHASE = { all: '6a041d0ffc4db70b8339c89c' };

// Contact persons fields
export const CONTACT_FIELD = {
  firstName: '6a041d0ffc4db70b8339c8e0',
  lastName: '6a041d0ffc4db70b8339c8e1',
  phone: '6a041d0ffc4db70b8339c8e2',
  email: '6a041d0ffc4db70b8339c8c5',
  title: '6a041d0ffc4db70b8339c8e3',
  company: '6a041d0ffc4db70b8339c8e4',
};

// Contact persons phase (single-phase dataset)
export const CONTACT_PHASE = { all: '6a041d0ffc4db70b8339c8e5' };

// Stage display colors — shared across the funnel views
export const STAGE_COLOR: Record<string, string> = {
  New: 'blue',
  Contacted: 'cyan',
  Qualified: 'purple',
  Converted: 'green',
  Disqualified: 'gray',
};

export const OPP_PHASE_COLOR: Record<string, string> = {
  Discovery: 'blue',
  'Budgetary Review': 'teal',
  Proposal: 'purple',
  Negotiations: 'orange',
  'Closed - Won': 'green',
  'Closed - Lost': 'gray',
};

// Aki gets auto-added as a follower on every new Lead and Opportunity so he
// sees all pipeline activity, not just the ones he personally creates.
export const AKI_USER_ID = '6a06d350e50920dc4947f463';
