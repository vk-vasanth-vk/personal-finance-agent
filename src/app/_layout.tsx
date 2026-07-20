import {
  processSmsMessage,
  startSmsImportIfEnabled,
} from "@/sms/service";
import { Stack } from "expo-router";
import { useSmsListener } from "expo-sms-listener";
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

  return <Stack />;
}
