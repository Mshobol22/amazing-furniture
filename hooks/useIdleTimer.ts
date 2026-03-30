"use client";

import { useEffect, useRef } from "react";

type UseIdleTimerOptions = {
  onIdle: () => void;
  idleThresholdMs?: number;
};

export function useIdleTimer({
  onIdle,
  idleThresholdMs = 45000,
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onIdleRef.current();
      }, idleThresholdMs);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [idleThresholdMs]);
}
