import { onUnmounted } from "vue";
import type { Ref } from "vue";

import type { RequestType } from "~/types/game";

const REQUEST_TIMEOUT_MS: Record<RequestType, number> = {
  move: 45000,
  evaluate: 12000,
  test: 45000,
};

type UseWebSocketReliabilityParams = {
  status: Ref<string>;
  open: () => void;
  close: () => void;
  onRequestTimedOut: (type: RequestType) => void;
};

export const useWebSocketReliability = ({
  status,
  open,
  close,
  onRequestTimedOut,
}: UseWebSocketReliabilityParams) => {
  let requestTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRequestTimeout = () => {
    if (!requestTimeoutTimer) return;
    clearTimeout(requestTimeoutTimer);
    requestTimeoutTimer = null;
  };

  const scheduleReconnect = () => {
    // 자동 재시도 없음. 사용자가 "Try reconnect"로만 재연결.
  };

  const ensureOpen = () => {
    if (status.value === "OPEN") return true;
    if (status.value === "CLOSED") open();
    return false;
  };

  const startRequestTimeout = (type: RequestType) => {
    clearRequestTimeout();
    requestTimeoutTimer = setTimeout(() => {
      clearRequestTimeout();
      close();
      onRequestTimedOut(type);
    }, REQUEST_TIMEOUT_MS[type]);
  };

  onUnmounted(() => {
    clearRequestTimeout();
  });

  return {
    ensureOpen,
    scheduleReconnect,
    startRequestTimeout,
    clearRequestTimeout,
  };
};
