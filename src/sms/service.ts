import {
  addExpenseAmount,
  getUncategorizedTransactions,
  initDb,
  insertTransaction,
  updateTransactionCategory,
  type Transaction,
} from "@/db";
import { needsUserCategory } from "@/sms/categories";
import { parseTransactionSms } from "@/sms/parser";
import * as Notifications from "expo-notifications";
import {
  checkSmsPermissionAsync,
  requestSmsPermissionAsync,
  startSmsListenerServiceAsync,
  type SmsMessage,
} from "expo-sms-listener";
import { DeviceEventEmitter, Platform } from "react-native";

export const TRANSACTION_IMPORTED_EVENT = "transaction-imported";
export const CATEGORIZE_NEEDED_EVENT = "categorize-needed";
const TRANSACTION_CHANNEL_ID = "transaction-imports";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepareNotifications(requestPermission: boolean) {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(TRANSACTION_CHANNEL_ID, {
    name: "Imported transactions",
    description: "Alerts when an expense is imported from a bank SMS",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  if (requestPermission) {
    await Notifications.requestPermissionsAsync();
  }
}

async function notifyImportedTransaction(
  transaction: Transaction,
  needsCategory: boolean
) {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    return;
  }

  await prepareNotifications(false);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: needsCategory ? "Choose a category" : "Expense imported",
      body: needsCategory
        ? `₹${transaction.amount.toFixed(2)} · ${transaction.merchant} — tap to categorize`
        : `₹${transaction.amount.toFixed(2)} · ${transaction.merchant} · ${transaction.category}`,
      data: { transactionId: transaction.id, needsCategory },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: TRANSACTION_CHANNEL_ID,
    },
  });
}

export async function processSmsMessage(
  message: SmsMessage
): Promise<Transaction | null> {
  const parsed = parseTransactionSms(message);
  if (parsed === null) {
    return null;
  }

  initDb();
  const transactionId = insertTransaction(parsed);
  if (transactionId === null) {
    return null;
  }

  const transaction: Transaction = {
    ...parsed,
    id: transactionId,
    createdAt: Date.now(),
  };

  const askUser = needsUserCategory(parsed.category);

  if (!askUser) {
    addExpenseAmount(parsed.category, parsed.amount);
  }

  DeviceEventEmitter.emit(TRANSACTION_IMPORTED_EVENT);
  if (askUser) {
    DeviceEventEmitter.emit(CATEGORIZE_NEEDED_EVENT, transaction);
  }

  await notifyImportedTransaction(transaction, askUser).catch(() => undefined);
  return transaction;
}

export function assignTransactionCategory(
  transactionId: number,
  category: string
): boolean {
  const trimmed = category.trim();
  if (!trimmed) {
    return false;
  }

  initDb();
  const pending = getUncategorizedTransactions().find(
    (item) => item.id === transactionId
  );
  if (!pending) {
    return false;
  }

  if (!updateTransactionCategory(transactionId, trimmed)) {
    return false;
  }

  addExpenseAmount(trimmed, pending.amount);
  DeviceEventEmitter.emit(TRANSACTION_IMPORTED_EVENT);
  return true;
}

export function peekNextUncategorized(): Transaction | null {
  initDb();
  return getUncategorizedTransactions()[0] ?? null;
}

export async function isSmsImportEnabled(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  const permission = await checkSmsPermissionAsync();
  return permission.granted;
}

export async function startSmsImportIfEnabled(): Promise<boolean> {
  if (!(await isSmsImportEnabled())) {
    return false;
  }

  await prepareNotifications(false);
  await startSmsListenerServiceAsync();
  return true;
}

export async function enableSmsImport(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  const permission = await requestSmsPermissionAsync();
  if (!permission.granted) {
    return false;
  }

  await prepareNotifications(true);
  await startSmsListenerServiceAsync();
  return true;
}
