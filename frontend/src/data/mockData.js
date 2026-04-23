// Realistic demo data for a Canadian user in Edmonton

export const MOCK_DASHBOARD = {
  totalCashAvailable: 3847.62,
  status: 'on-track',
  spendingTrend: {
    direction: 'up',
    currentMonth: 2134.50,
    previousMonth: 1876.00,
    percentChange: 13.8,
  },
  accounts: [
    { name: 'TD Chequing', balance: 2341.12, type: 'chequing' },
    { name: 'TD Savings', balance: 1506.50, type: 'savings' },
  ],
};

export const MOCK_INSIGHTS = [
  {
    id: 'mock-1',
    type: 'overspending',
    title: 'Food spending up 31% this month',
    body: "You've spent $487 on food & dining so far — $116 more than last month. Try meal prepping on Sundays to cut at least $60/week. That's $240 back in your pocket monthly.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'mock-2',
    type: 'idle_cash',
    title: '$1,500 sitting idle in savings',
    body: "Your TD savings account earns ~0.5% interest. A HISA like EQ Bank (3.75%) or a 90-day GIC could earn you $14–$56 more on that $1,500 with zero extra risk.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-3',
    type: 'savings_opportunity',
    title: 'You spend $127/month on subscriptions',
    body: "Netflix, Spotify, Apple One, and Amazon Prime total $127/month. Cutting one service saves $1,524/year — enough to max out a TFSA contribution in 5 years.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const MOCK_TRANSACTIONS = [
  { id: 't1', description: 'Safeway Grocery', merchantName: 'Safeway', category: 'food', amount: 94.37, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: 't2', description: 'Payroll Deposit', merchantName: 'Employer', category: 'income', amount: 2400.00, isDebit: false, date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 't3', description: 'Tim Hortons', merchantName: "Tim Hortons", category: 'food', amount: 7.45, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString() },
  { id: 't4', description: 'Netflix', merchantName: 'Netflix', category: 'entertainment', amount: 20.99, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
  { id: 't5', description: 'Petro-Canada', merchantName: 'Petro-Canada', category: 'transport', amount: 68.20, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString() },
  { id: 't6', description: 'Rent - April', merchantName: 'Property Mgmt', category: 'bills', amount: 1350.00, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: 't7', description: 'Shoppers Drug Mart', merchantName: 'Shoppers', category: 'health', amount: 34.18, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString() },
  { id: 't8', description: 'Spotify Premium', merchantName: 'Spotify', category: 'entertainment', amount: 11.99, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString() },
  { id: 't9', description: 'EPCOR Utilities', merchantName: 'EPCOR', category: 'bills', amount: 112.44, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString() },
  { id: 't10', description: 'Amazon Purchase', merchantName: 'Amazon', category: 'shopping', amount: 43.97, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString() },
  { id: 't11', description: "McDonald's", merchantName: "McDonald's", category: 'food', amount: 14.32, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 160).toISOString() },
  { id: 't12', description: 'ETS Monthly Pass', merchantName: 'Edmonton Transit', category: 'transport', amount: 100.00, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString() },
  { id: 't13', description: 'Freelance Payment', merchantName: 'E-transfer', category: 'income', amount: 350.00, isDebit: false, date: new Date(Date.now() - 1000 * 60 * 60 * 180).toISOString() },
  { id: 't14', description: 'Walmart', merchantName: 'Walmart', category: 'shopping', amount: 67.84, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 192).toISOString() },
  { id: 't15', description: 'Apple One', merchantName: 'Apple', category: 'entertainment', amount: 22.95, isDebit: true, date: new Date(Date.now() - 1000 * 60 * 60 * 210).toISOString() },
];

export const MOCK_OPPORTUNITIES = [
  {
    id: 'opp-1',
    type: 'side_hustle',
    title: 'Deliver with DoorDash in Edmonton',
    description: 'Earn $18–$25/hr delivering food on your own schedule. No experience needed — just a car or bike and a smartphone.',
    location: 'Edmonton, AB',
    actionType: 'explore',
    actionUrl: 'https://dasher.doordash.com',
  },
  {
    id: 'opp-2',
    type: 'investment_explainer',
    title: 'What is a TFSA and how do you max it out?',
    description: 'The Tax-Free Savings Account lets your money grow tax-free. The 2024 contribution limit is $7,000. Here\'s how to use it wisely.',
    location: null,
    actionType: 'learn_more',
    actionUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html',
  },
  {
    id: 'opp-3',
    type: 'event',
    title: 'Edmonton Young Professionals Mixer',
    description: 'Monthly networking event for professionals under 35. Meet founders, investors, and peers building their careers in Edmonton.',
    location: 'Downtown Edmonton',
    actionType: 'attend',
    actionUrl: '#',
  },
  {
    id: 'opp-4',
    type: 'gig',
    title: 'TaskRabbit Handyman Gigs',
    description: 'Skilled with tools? Earn $30–$65/hr completing home tasks in your neighbourhood. Flexible hours, instant payouts.',
    location: 'Edmonton, AB',
    actionType: 'explore',
    actionUrl: 'https://www.taskrabbit.ca',
  },
  {
    id: 'opp-5',
    type: 'investment_explainer',
    title: 'EQ Bank HISA — 3.75% interest on savings',
    description: "Canada's top high-interest savings account with no monthly fees. Your $1,500 idle balance could earn $56/year instead of $7.50 at a big bank.",
    location: null,
    actionType: 'learn_more',
    actionUrl: 'https://www.eqbank.ca',
  },
];

export const MOCK_CHAT_CONTEXT = {
  totalCash: 3847.62,
  monthlySpending: 2134.50,
  topCategory: 'food',
  userGoal: 'save_more',
};
