import * as SQLite from "expo-sqlite";

// Open (or create) the local database file on the device.
const db = SQLite.openDatabaseSync("finagent.db");

// The expenses object — keys/values are up to us for now
// (e.g. { food: 320, travel: 100 }).
export type Expenses = Record<string, number>;

// We keep a single row (id = 1) that holds the salary and the expenses object.
// `expenses` is stored as TEXT because SQLite can't store an object directly —
// we JSON.stringify it on the way in and JSON.parse it on the way out.
export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS finances (
      id INTEGER PRIMARY KEY NOT NULL,
      salary INTEGER,
      expenses TEXT
    );
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
