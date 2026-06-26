import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getSalary, initDb, saveSalary } from "@/db";

export default function Index() {
  // What the user is currently typing in the field
  const [input, setInput] = useState("");
  // The salary loaded from the database (null = not set yet)
  const [salary, setSalary] = useState<number | null>(null);
  // Have we finished reading the DB? Avoids flashing the form before we know.
  const [checked, setChecked] = useState(false);

  // On first render: set up the database and load any saved salary.
  useEffect(() => {
    initDb();
    setSalary(getSalary());
    setChecked(true);
  }, []);

  function handleSave() {
    const value = Number(input);
    if (!input || isNaN(value) || value <= 0) {
      return; // ignore empty / invalid input for now
    }
    saveSalary(value); // persist to SQLite
    router.replace("/expenses"); // go straight to expenses
  }

  // Wait until we've read the DB before deciding what to show.
  if (!checked) {
    return null;
  }

  // Salary already set → skip this page, go straight to expenses.
  if (salary !== null) {
    return <Redirect href="/expenses" />;
  }

  // First time: ask for the salary.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Salary</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your salary"
        keyboardType="numeric"
        value={input}
        onChangeText={setInput}
      />

      <Pressable style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  result: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
  },
});
