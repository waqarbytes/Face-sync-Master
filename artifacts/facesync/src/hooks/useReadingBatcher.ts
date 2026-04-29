import { useRef, useCallback, useEffect } from "react";
import { useAppendReadings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetInsightsSummaryQueryKey, getGetWellnessTrendQueryKey, getGetPostureBreakdownQueryKey, getGetEmotionBreakdownQueryKey, getListSessionsQueryKey, getGetSessionQueryKey, getListReadingsQueryKey } from "@workspace/api-client-react";
import type { NewReading } from "@workspace/api-client-react";

export function useReadingBatcher(sessionId: number | null) {
  const bufferRef = useRef<NewReading[]>([]);
  const appendMutation = useAppendReadings();
  const queryClient = useQueryClient();
  const mutateFnRef = useRef(appendMutation.mutate);
  mutateFnRef.current = appendMutation.mutate;

  const push = useCallback(
    (reading: Omit<NewReading, "capturedAt">) => {
      if (!sessionId) return;
      bufferRef.current.push({
        ...reading,
        capturedAt: new Date().toISOString(),
      });
    },
    [sessionId]
  );

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const readingsToSync = [...bufferRef.current];
        bufferRef.current = [];
        mutateFnRef.current(
          { id: sessionId, data: { readings: readingsToSync } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetInsightsSummaryQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetWellnessTrendQueryKey({}) });
              queryClient.invalidateQueries({ queryKey: getGetPostureBreakdownQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetEmotionBreakdownQueryKey() });
              queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
              queryClient.invalidateQueries({ queryKey: getListReadingsQueryKey(sessionId) });
            },
          }
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, queryClient]);

  return { push };
}
