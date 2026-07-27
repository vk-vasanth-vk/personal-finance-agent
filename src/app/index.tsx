import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSalary, initDb, saveSalary } from "@/db";
import { colors } from "@/theme";

export default function Index() {
  const [input, setInput] = useState("");
  const [salary, setSalary] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    initDb();
    setSalary(getSalary());
    setChecked(true);
  }, []);

  function handleSave() {
    const value = Number(input);
    if (!input.trim() || isNaN(value) || value <= 0) {
      setError("Enter a valid monthly salary amount.");
      return;
    }
    saveSalary(value);
    router.replace("/expenses");
  }

  if (!checked) {
    return <View style={styles.loading} />;
  }

  if (salary !== null) {
    return <Redirect href="/expenses" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>fin-agent</Text>
          <Text style={styles.title}>Set your monthly salary</Text>
          <Text style={styles.subtitle}>
            We’ll use this to track spending, remaining balance, and SMS
            imports.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.label}>Monthly salary</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 45000"
              placeholderTextColor={colors.inkMuted}
              keyboardType="numeric"
              value={input}
              onChangeText={(value) => {
                setInput(value);
                if (error) setError("");
              }}
              autoFocus
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  hero: {
    gap: 10,
  },
  brand: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.inkSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.canvas,
  },
  currency: {
    color: colors.inkSecondary,
    fontSize: 22,
    fontWeight: "700",
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonPressed: {
    backgroundColor: colors.brandDark,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
