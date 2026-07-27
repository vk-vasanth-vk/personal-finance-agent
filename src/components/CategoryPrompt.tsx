import type { Transaction } from "@/db";
import { getKnownCategories } from "@/sms/categories";
import {
  assignTransactionCategory,
  CATEGORIZE_NEEDED_EVENT,
  peekNextUncategorized,
} from "@/sms/service";
import { colors, formatMoney } from "@/theme";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  DeviceEventEmitter,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function CategoryPrompt() {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const categories = useMemo(() => getKnownCategories(), []);

  const showNextPending = useCallback(() => {
    const next = peekNextUncategorized();
    setTransaction(next);
    setSelected(null);
    setCustom("");
  }, []);

  useEffect(() => {
    showNextPending();

    const neededSubscription = DeviceEventEmitter.addListener(
      CATEGORIZE_NEEDED_EVENT,
      (incoming: Transaction) => {
        setTransaction((current) => current ?? incoming);
        setSelected(null);
        setCustom("");
      }
    );

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          showNextPending();
        }
      }
    );

    return () => {
      neededSubscription.remove();
      appStateSubscription.remove();
    };
  }, [showNextPending]);

  function handleConfirm() {
    if (!transaction) {
      return;
    }

    const category = (custom.trim() || selected || "").trim();
    if (!category) {
      return;
    }

    assignTransactionCategory(transaction.id, category);
    showNextPending();
  }

  function handleLater() {
    setTransaction(null);
  }

  if (!transaction) {
    return null;
  }

  const canSave = Boolean(custom.trim() || selected);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={handleLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Needs a category</Text>
          <Text style={styles.title}>Where should this go?</Text>
          <Text style={styles.amount}>
            {formatMoney(transaction.amount)} · {transaction.merchant}
          </Text>
          <Text style={styles.hint} numberOfLines={3}>
            {transaction.smsBody}
          </Text>

          <View style={styles.chips}>
            {categories.map((category) => {
              const isSelected = selected === category && !custom.trim();
              return (
                <Pressable
                  key={category}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => {
                    setSelected(category);
                    setCustom("");
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Or type a custom category"
            placeholderTextColor={colors.inkMuted}
            value={custom}
            onChangeText={(value) => {
              setCustom(value);
              if (value.trim()) {
                setSelected(null);
              }
            }}
          />

          <View style={styles.actions}>
            <Pressable style={styles.laterButton} onPress={handleLater}>
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canSave && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={!canSave}
            >
              <Text style={styles.confirmText}>Save category</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.brandDark,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.canvas,
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.inkSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  laterButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  laterText: {
    color: colors.inkSecondary,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmDisabled: {
    opacity: 0.45,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
