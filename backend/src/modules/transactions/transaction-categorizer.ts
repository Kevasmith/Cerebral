import { TransactionCategory } from '../../entities/transaction.entity';

const RULES: Array<{ patterns: RegExp[]; category: TransactionCategory }> = [
  {
    patterns: [/uber eats|doordash|skip|grubhub|mcdonalds|mcdonald|tim horton|starbucks|subway|pizza|restaurant|cafe|coffee|sushi|burger|pho|diner|bakery|chipotle|kfc|wendy|taco/i],
    category: TransactionCategory.FOOD,
  },
  {
    patterns: [/uber|lyft|taxi|transit|bus|train|ctrain|gas station|shell|esso|petro|parking|parkplus|airbnb/i],
    category: TransactionCategory.TRANSPORT,
  },
  {
    patterns: [/netflix|spotify|apple\.com|google play|steam|playstation|xbox|cinema|movie|theatre|ticketmaster|eventbrite|disney/i],
    category: TransactionCategory.ENTERTAINMENT,
  },
  {
    patterns: [/amazon|walmart|costco|ikea|best buy|bestbuy|sport chek|lululemon|h&m|zara|gap|old navy|winners|shoppers/i],
    category: TransactionCategory.SHOPPING,
  },
  {
    patterns: [/telus|rogers|bell|shaw|hydro|atco|enmax|epcor|insurance|mortgage|rent|lease|condo|utilities/i],
    category: TransactionCategory.BILLS,
  },
  {
    patterns: [/pharmacy|shoppers drug|rexall|london drugs|doctor|clinic|dental|dentist|optometrist|medical|health|gym|fitness|yoga|goodlife/i],
    category: TransactionCategory.HEALTH,
  },
  {
    patterns: [/westjet|air canada|hotel|marriott|hilton|airbnb|booking\.com|expedia|travel/i],
    category: TransactionCategory.TRAVEL,
  },
  {
    patterns: [/payroll|salary|direct deposit|e-transfer received|deposit|income|revenue/i],
    category: TransactionCategory.INCOME,
  },
  {
    patterns: [/transfer|interac|e-transfer|wire|payment to|payment from/i],
    category: TransactionCategory.TRANSFER,
  },
];

export function categorize(description: string): TransactionCategory {
  const lower = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(lower))) {
      return rule.category;
    }
  }
  return TransactionCategory.OTHER;
}
