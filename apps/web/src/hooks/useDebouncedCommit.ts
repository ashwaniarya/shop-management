'use client';

import { useEffect, useState } from 'react';

// Local "draft" state for a text input that only commits upstream (triggering a
// refetch) after the user pauses typing, instead of on every keystroke.
export function useDebouncedCommit(
  committedValue: string,
  onCommit: (value: string) => void,
  delayMs = 300,
): [string, (value: string) => void] {
  const [draft, setDraft] = useState(committedValue);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (draft !== committedValue) {
        onCommit(draft);
      }
    }, delayMs);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return [draft, setDraft];
}
