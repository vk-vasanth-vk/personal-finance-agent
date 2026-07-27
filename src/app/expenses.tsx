import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

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
import { colors, formatMoney, formatShortDate } from "@/theme";

export default function ExpensesScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [expenses, setExpenses] = useState<Expenses>({});
  const [salary, setSalary] = useState<number | null>(null);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [enablingSms, setEnablingSms] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [formError, setFormError] = useState("");

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

  const items = useMemo(
    () =>
      Object.entries(expenses).sort((a, b) => b[1] - a[1]),
    [expenses]
  );

  const totalSpent = useMemo(
    () => items.reduce((sum, [, amount]) => sum + amount, 0),
    [items]
  );

  const remaining =
    salary !== null ? salary - totalSpent : null;
  const spentRatio =
    salary && salary > 0 ? Math.min(totalSpent / salary, 1) : 0;

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

  function startEditSalary() {
    setSalaryInput(salary !== null ? String(salary) : "");
    setEditingSalary(true);
  }

  function handleSaveSalary() {
    const value = Number(salaryInput);
    if (!salaryInput || isNaN(value) || value <= 0) {
      return;
    }
    saveSalary(value);
    setSalary(value);
    setEditingSalary(false);
  }

  function startEditItem(itemName: string, itemPrice: number) {
    setName(itemName);
    setPrice(String(itemPrice));
    setEditingKey(itemName);
    setFormError("");
  }

  function handleDeleteItem(itemName: string) {
    const updated = { ...expenses };
    delete updated[itemName];
    saveExpenses(updated);
    setExpenses(updated);

    if (editingKey === itemName) {
      setName("");
      setPrice("");
      setEditingKey(null);
    }
  }

  function handleAdd() {
    const value = Number(price);
    if (!name.trim() || !price || isNaN(value) || value <= 0) {
      setFormError("Enter a category and a valid amount.");
      return;
    }
    const updated = { ...expenses };
    if (editingKey !== null && editingKey !== name.trim()) {
      delete updated[editingKey];
    }
    updated[name.trim()] = value;

    saveExpenses(updated);
    setExpenses(updated);
    setName("");
    setPrice("");
    setEditingKey(null);
    setFormError("");
  }

  function cancelEdit() {
    setName("");
    setPrice("");
    setEditingKey(null);
    setFormError("");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={transactions}
        keyExtractor={(transaction) => String(transaction.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>This month</Text>

              {editingSalary ? (
                <View style={styles.salaryEditRow}>
                  <Text style={styles.currencyMark}>₹</Text>
                  <TextInput
                    style={styles.salaryEditInput}
                    keyboardType="numeric"
                    value={salaryInput}
                    onChangeText={setSalaryInput}
                    placeholder="Salary"
                    placeholderTextColor={colors.brandMuted}
                    autoFocus
                  />
                  <Pressable
                    style={styles.heroAction}
                    onPress={handleSaveSalary}
                  >
                    <Text style={styles.heroActionText}>Save</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.remainingBlock}>
                  <Text style={styles.remainingLabel}>Remaining</Text>
                  <View style={styles.remainingRow}>
                    <Text style={styles.remainingValue}>
                      {remaining !== null ? formatMoney(remaining) : "—"}
                    </Text>
                    <Pressable onPress={startEditSalary} hitSlop={8}>
                      <Text style={styles.editLink}>Edit salary</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${spentRatio * 100}%`,
                      backgroundColor:
                        spentRatio > 0.9 ? "#FECACA" : "#FFFFFF",
                    },
                  ]}
                />
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Salary</Text>
                  <Text style={styles.heroStatValue}>
                    {salary !== null ? formatMoney(salary) : "—"}
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Spent</Text>
                  <Text style={styles.heroStatValue}>
                    {formatMoney(totalSpent)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.smsCard}>
              <View style={styles.smsCopy}>
                <View style={styles.smsTitleRow}>
                  <Text style={styles.smsTitle}>Bank SMS import</Text>
                  <View
                    style={[
                      styles.statusPill,
                      smsEnabled ? styles.statusOn : styles.statusOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        smsEnabled ? styles.statusTextOn : styles.statusTextOff,
                      ]}
                    >
                      {Platform.OS !== "android"
                        ? "Android only"
                        : smsEnabled
                          ? "On"
                          : "Off"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.smsDescription}>
                  {Platform.OS !== "android"
                    ? "SMS import works on Android devices only."
                    : smsEnabled
                      ? "Debit messages are captured and categorized automatically."
                      : "Turn on access to import new debit messages into your budget."}
                </Text>
                {smsError ? <Text style={styles.error}>{smsError}</Text> : null}
              </View>
              {Platform.OS === "android" && !smsEnabled ? (
                <Pressable
                  style={[styles.smsButton, enablingSms && styles.disabled]}
                  onPress={handleEnableSms}
                  disabled={enablingSms}
                >
                  <Text style={styles.smsButtonText}>
                    {enablingSms ? "Enabling…" : "Enable"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Text style={styles.sectionMeta}>
                {items.length} {items.length === 1 ? "group" : "groups"}
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingKey !== null ? "Update category" : "Add category"}
              </Text>
              <View style={styles.form}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="Category"
                  placeholderTextColor={colors.inkMuted}
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (formError) setFormError("");
                  }}
                />
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Amount"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={(value) => {
                    setPrice(value);
                    if (formError) setFormError("");
                  }}
                />
              </View>
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <View style={styles.formActions}>
                {editingKey !== null ? (
                  <Pressable style={styles.secondaryButton} onPress={cancelEdit}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.primaryButton} onPress={handleAdd}>
                  <Text style={styles.primaryButtonText}>
                    {editingKey !== null ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No categories yet</Text>
                <Text style={styles.emptyBody}>
                  Add one manually, or enable SMS import to fill them from bank
                  debits.
                </Text>
              </View>
            ) : (
              <View style={styles.categoryList}>
                {items.map(([itemName, itemPrice]) => {
                  const share =
                    totalSpent > 0 ? itemPrice / totalSpent : 0;
                  return (
                    <View style={styles.categoryRow} key={itemName}>
                      <View style={styles.categoryTop}>
                        <Text style={styles.categoryName}>{itemName}</Text>
                        <Text style={styles.categoryAmount}>
                          {formatMoney(itemPrice)}
                        </Text>
                      </View>
                      <View style={styles.categoryTrack}>
                        <View
                          style={[
                            styles.categoryFill,
                            { width: `${Math.max(share * 100, 4)}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.categoryActions}>
                        <Pressable
                          onPress={() => startEditItem(itemName, itemPrice)}
                          hitSlop={8}
                        >
                          <Text style={styles.actionLink}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteItem(itemName)}
                          hitSlop={8}
                        >
                          <Text style={styles.deleteLink}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent transactions</Text>
              <Text style={styles.sectionMeta}>
                {transactions.length}{" "}
                {transactions.length === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bank transactions yet</Text>
            <Text style={styles.emptyBody}>
              When a debit SMS arrives, it will show up here with its category.
            </Text>
          </View>
        }
        renderItem={({ item: transaction }) => {
          const pending = transaction.category === "Uncategorized";
          return (
            <View style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionMerchant} numberOfLines={1}>
                  {transaction.merchant}
                </Text>
                <View style={styles.transactionMetaRow}>
                  <View
                    style={[
                      styles.categoryPill,
                      pending && styles.categoryPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        pending && styles.categoryPillTextPending,
                      ]}
                    >
                      {transaction.category}
                    </Text>
                  </View>
                  <Text style={styles.transactionDate}>
                    {formatShortDate(transaction.occurredAt)}
                  </Text>
                </View>
              </View>
              <Text style={styles.transactionAmount}>
                −{formatMoney(transaction.amount)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 10,
  },
  header: {
    gap: 14,
    marginBottom: 6,
  },
  heroCard: {
    backgroundColor: colors.brand,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  heroEyebrow: {
    color: colors.brandMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  remainingBlock: {
    gap: 4,
  },
  remainingLabel: {
    color: colors.brandMuted,
    fontSize: 14,
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  remainingValue: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  editLink: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.9,
    paddingBottom: 6,
  },
  salaryEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyMark: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  salaryEditInput: {
    flex: 1,
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: colors.brandMuted,
    paddingVertical: 2,
  },
  heroAction: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: {
    flex: 1,
    gap: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 12,
  },
  heroStatLabel: {
    color: colors.brandMuted,
    fontSize: 12,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  smsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  smsCopy: {
    flex: 1,
    gap: 6,
  },
  smsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smsTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusOn: {
    backgroundColor: colors.successSoft,
  },
  statusOff: {
    backgroundColor: colors.warningSoft,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextOn: {
    color: colors.success,
  },
  statusTextOff: {
    color: colors.warning,
  },
  smsDescription: {
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  smsButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  smsButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  sectionHeader: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionMeta: {
    color: colors.inkMuted,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  formTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  form: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  nameInput: {
    flex: 1,
  },
  priceInput: {
    width: 96,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.canvas,
  },
  secondaryButtonText: {
    color: colors.inkSecondary,
    fontWeight: "600",
  },
  categoryList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  categoryAmount: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  categoryTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    overflow: "hidden",
  },
  categoryFill: {
    height: "100%",
    backgroundColor: colors.brand,
    borderRadius: 999,
  },
  categoryActions: {
    flexDirection: "row",
    gap: 14,
  },
  actionLink: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteLink: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  transactionLeft: {
    flex: 1,
    gap: 6,
  },
  transactionMerchant: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  transactionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillPending: {
    backgroundColor: colors.warningSoft,
  },
  categoryPillText: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "700",
  },
  categoryPillTextPending: {
    color: colors.warning,
  },
  transactionDate: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  transactionAmount: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.inkSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.55,
  },
});
