/**
 * Keyword → category map for SMS merchant / body matching.
 * Merchant is checked first; body is a fallback. First match wins.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    "hotel",
    "mess",
    "stall",
    "food",
    "restaurant",
    "cafe",
    "coffee",
    "bakery",
    "canteen",
    "dhaba",
    "swiggy",
    "zomato",
    "dominos",
    "mcdonald",
    "kfc",
    "biryani",
    "kitchen",
  ],
  Travel: [
    "uber",
    "ola",
    "rapido",
    "irctc",
    "railway",
    "airline",
    "flight",
    "petrol",
    "petrol pump",
    "diesel",
    "fuel",
    "fuel station",
    "cng",
    "hpcl",
    "iocl",
    "bpcl",
    "indian oil",
    "bharat petroleum",
    "hindustan petroleum",
    "shell",
    "nayara",
    "metro",
    "fastag",
    "parking",
    "taxi",
    "bus",
  ],
  Accessories: [
    "accessory",
    "accessories",
    "watch",
    "earphone",
    "earphones",
    "headphone",
    "headphones",
    "earbuds",
    "airpods",
    "charger",
    "cable",
    "case",
    "cover",
    "bag",
    "wallet",
    "belt",
    "sunglasses",
    "spectacle",
    "glasses",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "meesho",
    "mall",
    "store",
    "mart",
    "retail",
    "supermarket",
    "dmart",
    "reliance",
  ],
  Bills: [
    "electricity",
    "broadband",
    "airtel",
    "jio",
    "vodafone",
    "recharge",
    "bill",
    "gas",
    "water",
    "insurance",
    "rent",
    "emi",
  ],
  Health: [
    "hospital",
    "clinic",
    "pharmacy",
    "medical",
    "medicine",
    "apollo",
    "netmeds",
    "pharmeasy",
    "doctor",
  ],
  Entertainment: [
    "netflix",
    "spotify",
    "prime video",
    "hotstar",
    "cinema",
    "movie",
    "bookmyshow",
    "gaming",
    "playstation",
  ],
  Education: [
    "school",
    "college",
    "university",
    "course",
    "udemy",
    "tuition",
    "fees",
    "fee",
  ],
  Investment: [
    "mutual fund",
    "sip",
    "groww",
    "zerodha",
    "upstox",
    "angel one",
    "angelone",
    "kuvera",
    "coin",
    "stocks",
    "share",
    "demat",
    "nps",
    "ppf",
    "fd",
    "fixed deposit",
    "investment",
    "invest",
  ],
};

/** Used when no keyword matches — user must pick a category in the app. */
export const DEFAULT_CATEGORY = "Uncategorized";

export function getKnownCategories(): string[] {
  return Object.keys(CATEGORY_KEYWORDS);
}

export function needsUserCategory(category: string): boolean {
  return category === DEFAULT_CATEGORY;
}

function textIncludesKeyword(text: string, keyword: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  // Multi-word keywords (e.g. "prime video") use plain includes.
  if (normalizedKeyword.includes(" ")) {
    return normalizedText.includes(normalizedKeyword);
  }

  // Single words use word-boundary style matching so "jio" does not match "region".
  const pattern = new RegExp(
    `(^|[^a-z0-9])${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
    "i"
  );
  return pattern.test(text);
}

function matchCategoryInText(text: string): string | null {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => textIncludesKeyword(text, keyword))) {
      return category;
    }
  }
  return null;
}

/** Prefer merchant/vendor text; fall back to full SMS body; else Uncategorized. */
export function categorizeTransaction(merchant: string, body: string): string {
  return (
    matchCategoryInText(merchant) ??
    matchCategoryInText(body) ??
    DEFAULT_CATEGORY
  );
}
