import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  DeviceEventEmitter,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Expenses,
  getExpenses,
  getSalary,
  getTransactions,
  initDb,
  saveExpenses,
  saveSalary,
  Transaction,
} from "@/db";
import {
  enableSmsImport,
  isSmsImportEnabled,
  TRANSACTION_IMPORTED_EVENT,
} from "@/sms/service";

export default function ExpensesScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [expenses, setExpenses] = useState<Expenses>({});
  const [salary, setSalary] = useState<number | null>(null);
  // Salary edit mode + the value being typed while editing
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  // Which expense we're editing (its original name), or null when adding new
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [enablingSms, setEnablingSms] = useState(false);
  const [smsError, setSmsError] = useState("");

  const loadSavedData = useCallback(() => {
    initDb();
    setSalary(getSalary());
    setExpenses(getExpenses());
    setTransactions(getTransactions());
  }, []);

  useEffect(() => {
    loadSavedData();
    void isSmsImportEnabled()
      .then(setSmsEnabled)
      .catch(() => setSmsEnabled(false));
  }, [loadSavedData]);

  useEffect(() => {
    const transactionSubscription = DeviceEventEmitter.addListener(
      TRANSACTION_IMPORTED_EVENT,
      loadSavedData
    );
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadSavedData();
      }
    });

    return () => {
      transactionSubscription.remove();
      appStateSubscription.remove();
    };
  }, [loadSavedData]);

  async function handleEnableSms() {
    setEnablingSms(true);
    setSmsError("");

    try {
      const enabled = await enableSmsImport();
      setSmsEnabled(enabled);
      if (!enabled) {
        setSmsError("SMS permission was not granted.");
      }
    } catch {
      setSmsError("Could not start SMS import. Rebuild the development app.");
    } finally {
      setEnablingSms(false);
    }
  }

  // Open the salary editor, pre-filled with the current value.
  function startEditSalary() {
    setSalaryInput(salary !== null ? String(salary) : "");
    setEditingSalary(true);
  }

  // Save the edited salary back to the database.
  function handleSaveSalary() {
    const value = Number(salaryInput);
    if (!salaryInput || isNaN(value) || value <= 0) {
      return; // ignore invalid input
    }
    saveSalary(value); // persist to SQLite
    setSalary(value); // update the screen
    setEditingSalary(false); // close the editor
  }

  // Load an existing expense into the form to edit it.
  function startEditItem(itemName: string, itemPrice: number) {
    setName(itemName);
    setPrice(String(itemPrice));
    setEditingKey(itemName);
  }

  // Remove an expense from the list.
  function handleDeleteItem(itemName: string) {
    const updated = { ...expenses };
    delete updated[itemName];
    saveExpenses(updated); // persist to SQLite
    setExpenses(updated); // update the screen

    // If we were editing this item, cancel the edit and clear the form.
    if (editingKey === itemName) {
      setName("");
      setPrice("");
      setEditingKey(null);
    }
  }

  // Handles both adding a new expense and updating an edited one.
  function handleAdd() {
    const value = Number(price);
    if (!name.trim() || !price || isNaN(value) || value <= 0) {
      return; // ignore empty / invalid input for now
    }
    const updated = { ...expenses };
    // If editing and the name changed, drop the old entry first.
    if (editingKey !== null && editingKey !== name.trim()) {
      delete updated[editingKey];
    }
    updated[name.trim()] = value;

    saveExpenses(updated); // persist to SQLite
    setExpenses(updated); // update the screen
    setName("");
    setPrice("");
    setEditingKey(null); // back to "add" mode
  }

  // Turn the { name: price } object into a list for rendering.
  const items = Object.entries(expenses);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={transactions}
      keyExtractor={(transaction) => String(transaction.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.salaryCard}>
            <Text style={styles.salaryLabel}>Monthly Salary</Text>

            {editingSalary ? (
              <View style={styles.salaryEditRow}>
                <TextInput
                  style={styles.salaryEditInput}
                  keyboardType="numeric"
                  value={salaryInput}
                  onChangeText={setSalaryInput}
                  placeholder="Enter salary"
                  placeholderTextColor="#cfe4ff"
                  autoFocus
                />
                <Pressable onPress={handleSaveSalary} hitSlop={8}>
                  <Text style={styles.salaryIcon}>✓</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.salaryValueRow}>
                <Text style={styles.salaryValue}>
                  {salary !== null ? `₹${salary}` : "—"}
                </Text>
                <Pressable onPress={startEditSalary} hitSlop={8}>
                  <Text style={styles.salaryIcon}>✏️</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.smsCard}>
            <View style={styles.smsText}>
              <Text style={styles.smsTitle}>Automatic bank SMS import</Text>
              <Text style={styles.smsDescription}>
                {Platform.OS !== "android"
                  ? "SMS import is available on Android only."
                  : smsEnabled
                    ? "Enabled. New debit messages are saved automatically."
                    : "Enable access to capture and categorize new debit messages."}
              </Text>
              {smsError ? <Text style={styles.error}>{smsError}</Text> : null}
            </View>
            {Platform.OS === "android" && !smsEnabled ? (
              <Pressable
                style={[styles.smsButton, enablingSms && styles.buttonDisabled]}
                onPress={handleEnableSms}
                disabled={enablingSms}
              >
                <Text style={styles.smsButtonText}>
                  {enablingSms ? "Enabling…" : "Enable"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.title}>Manual expenses</Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Expense name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="Price"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <Pressable style={styles.button} onPress={handleAdd}>
              <Text style={styles.buttonText}>
                {editingKey !== null ? "Update" : "Add"}
              </Text>
            </Pressable>
          </View>

          {items.length === 0 ? (
            <Text style={styles.empty}>No manual expenses yet.</Text>
          ) : (
            items.map(([itemName, itemPrice]) => (
              <View style={styles.row} key={itemName}>
                <Text style={styles.rowName}>{itemName}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.rowPrice}>₹{itemPrice}</Text>
                  <Pressable
                    onPress={() => startEditItem(itemName, itemPrice)}
                    hitSlop={8}
                  >
                    <Text style={styles.rowIcon}>✏️</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteItem(itemName)}
                    hitSlop={8}
                  >
                    <Text style={styles.rowIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.title, styles.transactionTitle]}>
            Bank transactions
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          New bank debit messages will appear here.
        </Text>
      }
      renderItem={({ item: transaction }) => (
        <View style={styles.transactionRow}>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionMerchant} numberOfLines={1}>
              {transaction.merchant}
            </Text>
            <Text style={styles.transactionMeta}>
              {transaction.category} ·{" "}
              {new Date(transaction.occurredAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>
            −₹{transaction.amount.toFixed(2)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    gap: 16,
  },
  salaryCard: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    padding: 16,
  },
  salaryLabel: {
    color: "#cfe4ff",
    fontSize: 14,
  },
  salaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  salaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  salaryEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  salaryEditInput: {
    flex: 1,
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#cfe4ff",
    paddingVertical: 2,
  },
  salaryIcon: {
    fontSize: 20,
    color: "#fff",
  },
  smsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#eef7ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe4ff",
  },
  smsText: {
    flex: 1,
    gap: 3,
  },
  smsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#12395b",
  },
  smsDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: "#45657e",
  },
  smsButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  smsButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  error: {
    color: "#b42318",
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  form: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  nameInput: {
    flex: 1,
  },
  priceInput: {
    width: 80,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowName: {
    fontSize: 16,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowIcon: {
    fontSize: 16,
  },
  transactionTitle: {
    marginTop: 8,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  transactionDetails: {
    flex: 1,
    gap: 3,
  },
  transactionMerchant: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionMeta: {
    color: "#6b7280",
    fontSize: 13,
  },
  transactionAmount: {
    color: "#b42318",
    fontSize: 16,
    fontWeight: "700",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 24,
  },
});
