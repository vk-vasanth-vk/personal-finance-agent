import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Expenses, getExpenses, getSalary, initDb, saveExpenses } from "@/db";

export default function ExpensesScreen() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [expenses, setExpenses] = useState<Expenses>({});
  const [salary, setSalary] = useState<number | null>(null);

  // Load saved salary and expenses when the page opens.
  useEffect(() => {
    initDb();
    setSalary(getSalary());
    setExpenses(getExpenses());
  }, []);

  function handleAdd() {
    const value = Number(price);
    if (!name.trim() || !price || isNaN(value) || value <= 0) {
      return; // ignore empty / invalid input for now
    }
    const updated = { ...expenses, [name.trim()]: value };
    saveExpenses(updated); // persist to SQLite
    setExpenses(updated); // update the screen
    setName("");
    setPrice("");
  }

  // Turn the { name: price } object into a list for rendering.
  const items = Object.entries(expenses);

  return (
    <View style={styles.container}>
      <View style={styles.salaryCard}>
        <Text style={styles.salaryLabel}>Monthly Salary</Text>
        <Text style={styles.salaryValue}>
          {salary !== null ? `₹${salary}` : "—"}
        </Text>
      </View>

      <Text style={styles.title}>Expenses</Text>

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
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={([itemName]) => itemName}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet. Add one above.</Text>
        }
        renderItem={({ item: [itemName, itemPrice] }) => (
          <View style={styles.row}>
            <Text style={styles.rowName}>{itemName}</Text>
            <Text style={styles.rowPrice}>₹{itemPrice}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
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
  salaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
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
  },
  rowPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 24,
  },
});
