import { useEffect } from 'react';

/**
 * Warn the user before closing/reloading the tab if they have unsaved form data.
 * Wire it up in any page with a dirty form:
 *   useUnsavedChanges(isDirty);
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved data. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

/**
 * Ask for confirmation before running `action` (e.g. closing a modal) if form is dirty.
 */
export function confirmDiscard(isDirty: boolean, action: () => void) {
  if (!isDirty || window.confirm('You have unsaved changes. Discard?')) action();
}
