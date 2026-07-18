'use client';

import { useEffect, useRef, useState } from 'react';

// Local "draft" state for a text input that only commits upstream (triggering a
// refetch) after the user pauses typing, instead of on every keystroke.
// onCommit and committedValue are read through refs at fire time: a pending timer
// would otherwise call a stale onCommit closing over old sibling-filter values,
// silently reverting a filter the user changed while the debounce was in flight.
export function useDebouncedCommit(
  committedValue: string,
  onCommit: (value: string) => void,
  delayMs = 300,
): [string, (value: string) => void] {
  const [draft, setDraft] = useState(committedValue);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const committedValueRef = useRef(committedValue);
  committedValueRef.current = committedValue;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (draft !== committedValueRef.current) {
        onCommitRef.current(draft);
      }
    }, delayMs);
    return () => clearTimeout(timeoutId);
  }, [draft, delayMs]);

  return [draft, setDraft];
}
