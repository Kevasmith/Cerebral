import { TransactionsService } from './transactions.service';
import { TransactionCategory } from '../../entities/transaction.entity';

// Minimal stub — categorization tests only need create + save
const mockRepo = {
  create: jest.fn().mockImplementation((data) => data),
  save:   jest.fn().mockImplementation((data) => Promise.resolve({ id: 'uuid-1', ...data })),
  findOne: jest.fn().mockResolvedValue(null),
  createQueryBuilder: jest.fn(),
  update: jest.fn(),
  findOneOrFail: jest.fn(),
};

const mockFlinks = { getTransactions: jest.fn() };

function makeService() {
  return new TransactionsService(mockRepo as any, mockFlinks as any);
}

async function categorize(
  service: TransactionsService,
  opts: {
    description: string;
    isDebit?: boolean;
    merchantName?: string;
    plaidPrimaryCategory?: string | null;
  },
): Promise<TransactionCategory> {
  mockRepo.save.mockClear();
  await service.createTransaction({
    accountId: 'acct-1',
    amount: 10,
    date: new Date(),
    isDebit: opts.isDebit ?? true,
    ...opts,
  });
  return mockRepo.save.mock.calls[0][0].category as TransactionCategory;
}

describe('TransactionsService — categorizeTransaction', () => {
  let service: TransactionsService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    service = makeService();
    jest.clearAllMocks();
    mockRepo.create.mockImplementation((data) => data);
    mockRepo.save.mockImplementation((data) => Promise.resolve({ id: 'uuid-1', ...data }));
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it.each([
    ['Uber Eats delivery',       'food'],
    ['DoorDash order #123',      'food'],
    ['Starbucks coffee shop',    'food'],
    ['Loblaws grocery store',    'food'],
    ['Trader Joe\'s market',     'food'],
  ])('categorises "%s" as FOOD', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Uber trip Toronto',        'transport'],
    ['Shell Gas Station',        'transport'],
    ['TTC Monthly transit pass',  'transport'],
    ['Green Parking Lot',        'transport'],
  ])('categorises "%s" as TRANSPORT', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Netflix monthly subscription', 'entertainment'],
    ['Spotify Premium',              'entertainment'],
    ['AMC Cinema tickets',           'entertainment'],
    ['LA Fitness gym membership',    'entertainment'],
  ])('categorises "%s" as ENTERTAINMENT', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Amazon.ca purchase',      'shopping'],
    ['H&M clothing store',      'shopping'],
    ['Best Buy electronics',    'shopping'],
  ])('categorises "%s" as SHOPPING', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Rogers phone bill',       'bills'],
    ['Hydro One electric',      'bills'],
    ['Bell internet monthly',   'bills'],
  ])('categorises "%s" as BILLS', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Rexall pharmacy purchase', 'health'],
    ['Dental clinic visit',      'health'],
    ['CVS medical supplies',     'health'],
  ])('categorises "%s" as HEALTH', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it.each([
    ['Air Canada flight YYZ-LHR', 'travel'],
    ['Airbnb reservation',        'travel'],
    ['Booking.com hotel stay',    'travel'],
  ])('categorises "%s" as TRAVEL', async (description, expected) => {
    expect(await categorize(service, { description })).toBe(expected);
  });

  it('categorises a non-debit deposit as INCOME', async () => {
    const cat = await categorize(service, {
      description: 'Direct deposit payroll',
      isDebit: false,
    });
    expect(cat).toBe(TransactionCategory.INCOME);
  });

  it('falls back to Plaid primary category when no merchant pattern matches', async () => {
    const cat = await categorize(service, {
      description: 'XYZ Widget Co',
      plaidPrimaryCategory: 'HOME_IMPROVEMENT',
    });
    expect(cat).toBe(TransactionCategory.HOME);
  });

  it('returns OTHER when nothing matches and no Plaid fallback', async () => {
    const cat = await categorize(service, {
      description: 'zzz totally unknown merchant',
    });
    expect(cat).toBe(TransactionCategory.OTHER);
  });

  it('merchant pattern wins over Plaid fallback', async () => {
    // Description matches FOOD; Plaid says MEDICAL — food wins
    const cat = await categorize(service, {
      description: 'Whole Foods market',
      plaidPrimaryCategory: 'MEDICAL',
    });
    expect(cat).toBe(TransactionCategory.FOOD);
  });
});
