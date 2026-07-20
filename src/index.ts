import { processSmsMessage } from "@/sms/service";
import type { SmsMessage } from "expo-sms-listener";
import { AppRegistry } from "react-native";

AppRegistry.registerHeadlessTask(
  "ExpoSmsListenerBackground",
  () => async (message: SmsMessage) => {
    await processSmsMessage(message);
  }
);

// Expo Router must load after the background task is registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("expo-router/entry");
