import { useEffect, useRef } from 'react';

/** Chama `onNext` após `delayMs` enquanto `active` for verdadeiro. */
export function useAutoAdvance(active: boolean, onNext: () => void, delayMs = 700): void {
  const latest = useRef(onNext);
  useEffect(() => {
    latest.current = onNext;
  });
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => latest.current(), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);
}
