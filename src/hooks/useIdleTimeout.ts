import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/auth';

/**
 * Idle timeout hook.
 * - Triggers a warning `warnBeforeMs` before logout.
 * - Logs the user out after `timeoutMs` of no activity.
 * Activity = mousemove, keydown, click, scroll, touchstart.
 */
export function useIdleTimeout(timeoutMs = 30 * 60 * 1000, warnBeforeMs = 60 * 1000) {
  const { isAuthenticated, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warnBeforeMs / 1000));
  const warnTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (warnTimer.current) { clearTimeout(warnTimer.current); warnTimer.current = null; }
    if (logoutTimer.current) { clearTimeout(logoutTimer.current); logoutTimer.current = null; }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
  };

  const startTimers = () => {
    clearTimers();
    setShowWarning(false);
    warnTimer.current = window.setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.floor(warnBeforeMs / 1000));
      countdownTimer.current = window.setInterval(() => {
        setSecondsLeft(s => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, timeoutMs - warnBeforeMs);
    logoutTimer.current = window.setTimeout(() => {
      clearTimers();
      logout();
      window.location.href = '/login?reason=idle';
    }, timeoutMs);
  };

  const stayLoggedIn = () => {
    startTimers();
  };

  useEffect(() => {
    if (!isAuthenticated()) { clearTimers(); return; }
    const reset = () => { if (!showWarning) startTimers(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    startTimers();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, reset));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
