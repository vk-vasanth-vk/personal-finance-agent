import type { NewTransaction } from "@/db";
import type { SmsMessage } from "expo-sms-listener";

const DEBIT_WORDS =
  /\b(debited|spent|paid|purchase|purchased|withdrawn|sent|payment|transferred)\b/i;
const CREDIT_WORDS =
  /\b(credited|received|refund(?:ed)?|reversal|reversed|cashback)\b/i;
const NON_TRANSACTION_WORDS =
  /\b(otp|one[- ]time password|verification code|login code)\b/i;

const CATEGORY_RULES: { category: string; keywords: RegExp }[] = [
  {
    category: "Food",
    keywords:
      /\b(swiggy|zomato|restaurant|cafe|coffee|food|bakery|dominos|mcdonald|kfc)\b/i,
  },
  {
    category: "Travel",
    keywords:
      /\b(uber|ola|rapido|irctc|railway|airline|flight|petrol|diesel|fuel|metro|fastag)\b/i,
  },
  {
    category: "Shopping",
    keywords:
      /\b(amazon|flipkart|myntra|ajio|meesho|mall|store|mart|retail)\b/i,
  },
  {
    category: "Bills",
    keywords:
      /\b(electricity|broadband|airtel|jio|vi |vodafone|recharge|bill|gas|water|insurance)\b/i,
  },
  {
    category: "Health",
    keywords:
      /\b(hospital|clinic|pharmacy|medical|medicine|apollo|netmeds|pharmeasy)\b/i,
  },
  {
    category: "Entertainment",
    keywords:
      /\b(netflix|spotify|prime video|hotstar|cinema|movie|bookmyshow|gaming)\b/i,
  },
  {
    category: "Education",
    keywords: /\b(school|college|university|course|udemy|book|tuition|fees?)\b/i,
  },
];

function extractAmount(body: string): number | null {
  const currencyBefore = body.match(
    /(?:₹|inr|rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  const currencyAfter = body.match(
    /([\d,]+(?:\.\d{1,2})?)\s*(?:₹|inr|rs\.?)(?:\s|$)/i
  );
  const amountAfterDebitWord = body.match(
    /\b(?:debited|spent|paid|withdrawn|sent)\b(?:\s+(?:by|with|for|of))?\s*(?:₹|inr|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  const rawAmount =
    currencyBefore?.[1] ??
    currencyAfter?.[1] ??
    amountAfterDebitWord?.[1];

  if (!rawAmount) {
    return null;
  }

  const amount = Number(rawAmount.replaceAll(",", ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function cleanMerchant(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[*#]/g, "")
    .replace(/\s+(?:ref|txn|upi)$/i, "")
    .trim();
}

function extractMerchant(body: string, sender: string): string {
  const merchantMatch = body.match(
    /(?:\bto|\bat|\btowards|\bvia)\s+([a-z0-9][a-z0-9 .&@_/-]{1,40}?)(?=\s+(?:on|using|ref|txn|upi|avl|available|from|dated|with)\b|[,.]|$)/i
  );
  const merchant = merchantMatch?.[1]
    ? cleanMerchant(merchantMatch[1])
    : cleanMerchant(sender);

  return merchant || "Unknown merchant";
}

export function categorizeTransaction(merchant: string, body: string): string {
  const searchableText = `${merchant} ${body}`;
  return (
    CATEGORY_RULES.find(({ keywords }) => keywords.test(searchableText))
      ?.category ?? "Other"
  );
}

function createSmsHash(message: SmsMessage): string {
  const input = `${message.originatingAddress}|${message.body}|${message.timestamp}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `sms_${(hash >>> 0).toString(16)}`;
}

export function parseTransactionSms(
  message: SmsMessage
): NewTransaction | null {
  const body = message.body.trim();

  if (
    !body ||
    !DEBIT_WORDS.test(body) ||
    CREDIT_WORDS.test(body) ||
    NON_TRANSACTION_WORDS.test(body)
  ) {
    return null;
  }

  const amount = extractAmount(body);
  if (amount === null) {
    return null;
  }

  const merchant = extractMerchant(body, message.originatingAddress);

  return {
    amount,
    merchant,
    category: categorizeTransaction(merchant, body),
    sender: message.originatingAddress,
    smsBody: body,
    smsHash: createSmsHash(message),
    occurredAt: message.timestamp || Date.now(),
  };
}
