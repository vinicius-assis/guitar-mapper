import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const;

function read(): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'mobile';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`).matches) return 'desktop';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`).matches) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const queries = [BREAKPOINTS.tablet, BREAKPOINTS.desktop].map((w) =>
      window.matchMedia(`(min-width: ${w}px)`),
    );
    const update = () => setBreakpoint(read());
    queries.forEach((q) => q.addEventListener('change', update));
    update();
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, []);
  return breakpoint;
}
