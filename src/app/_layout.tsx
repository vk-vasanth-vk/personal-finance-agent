import { CategoryPrompt } from "@/components/CategoryPrompt";
import {
  processSmsMessage,
  startSmsImportIfEnabled,
} from "@/sms/service";
import { colors } from "@/theme";
import { Stack } from "expo-router";
import { useSmsListener } from "expo-sms-listener";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";

export default function RootLayout() {
  const handleSms = useCallback(
    (message: Parameters<typeof processSmsMessage>[0]) => {
      void processSmsMessage(message);
    },
    []
  );

  useSmsListener(handleSms);

  useEffect(() => {
    void startSmsImportIfEnabled();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="expenses"
          options={{ title: "Overview" }}
        />
      </Stack>
      <CategoryPrompt />
    </>
  );
}
