import * as SQLite from "expo-sqlite";

// Open (or create) the local database file on the device.
const db = SQLite.openDatabaseSync("finagent.db");

// The expenses object — keys/values are up to us for now
// (e.g. { food: 320, travel: 100 }).
export type Expenses = Record<string, number>;

export type Transaction = {
  id: number;
  amount: number;
  merchant: string;
  category: string;
  sender: string;
  smsBody: string;
  smsHash: string;
  occurredAt: number;
  createdAt: number;
};

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS finances (
      id INTEGER PRIMARY KEY NOT NULL,
      salary INTEGER,
      expenses TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL,
      sender TEXT NOT NULL,
      sms_body TEXT NOT NULL,
      sms_hash TEXT NOT NULL UNIQUE,
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx
      ON transactions (occurred_at DESC);
  `);
  // Make sure the single row exists so we can always UPDATE it.
  db.runSync(
    "INSERT OR IGNORE INTO finances (id, salary, expenses) VALUES (1, NULL, '{}')"
  );
}

// Save (overwrite) the monthly salary.
export function saveSalary(salary: number) {
  db.runSync("UPDATE finances SET salary = ? WHERE id = 1", salary);
}

// Read the salary back. Returns null if it was never set.
export function getSalary(): number | null {
  const row = db.getFirstSync<{ salary: number | null }>(
    "SELECT salary FROM finances WHERE id = 1"
  );
  return row?.salary ?? null;
}

// Save (overwrite) the whole expenses object.
export function saveExpenses(expenses: Expenses) {
  db.runSync(
    "UPDATE finances SET expenses = ? WHERE id = 1",
    JSON.stringify(expenses)
  );
}

// Read the expenses object back as a real JS object.
export function getExpenses(): Expenses {
  const row = db.getFirstSync<{ expenses: string }>(
    "SELECT expenses FROM finances WHERE id = 1"
  );
  return row ? (JSON.parse(row.expenses) as Expenses) : {};
}

export function insertTransaction(transaction: NewTransaction): number | null {
  const result = db.runSync(
    `INSERT OR IGNORE INTO transactions
      (amount, merchant, category, sender, sms_body, sms_hash, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    transaction.amount,
    transaction.merchant,
    transaction.category,
    transaction.sender,
    transaction.smsBody,
    transaction.smsHash,
    transaction.occurredAt,
    Date.now()
  );

  return result.changes > 0 ? result.lastInsertRowId : null;
}

export function getTransactions(limit = 100): Transaction[] {
  return db.getAllSync<{
    id: number;
    amount: number;
    merchant: string;
    category: string;
    sender: string;
    sms_body: string;
    sms_hash: string;
    occurred_at: number;
    created_at: number;
  }>(
    `SELECT id, amount, merchant, category, sender, sms_body, sms_hash,
            occurred_at, created_at
     FROM transactions
     ORDER BY occurred_at DESC
     LIMIT ?`,
    limit
  ).map((row) => ({
    id: row.id,
    amount: row.amount,
    merchant: row.merchant,
    category: row.category,
    sender: row.sender,
    smsBody: row.sms_body,
    smsHash: row.sms_hash,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}
