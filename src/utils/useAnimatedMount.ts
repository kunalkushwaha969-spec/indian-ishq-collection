import { useState, useEffect } from 'react';

export interface AnimatedMountState {
  /** Whether the element should be rendered in the DOM */
  shouldRender: boolean;
  /** Whether the element is in its visible / entered state */
  isEntered: boolean;
}

/**
 * Lightweight hook to manage smooth enter & exit CSS transitions for drawers,
 * modals, mobile navigation menus, and notifications without unmounting abruptly.
 */
export function useAnimatedMount(isOpen: boolean, exitDurationMs: number = 240): AnimatedMountState {
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isEntered, setIsEntered] = useState<boolean>(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      let raf1 = 0;
      let raf2 = 0;
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsEntered(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    } else {
      setIsEntered(false);
      const timer = window.setTimeout(() => {
        setShouldRender(false);
      }, exitDurationMs);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, exitDurationMs]);

  return { shouldRender, isEntered };
}
