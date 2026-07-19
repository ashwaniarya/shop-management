'use client';

import { useCallback, useMemo } from 'react';

import type { PartGrade } from '@shop/shared';

import { listPartGrades } from '@/lib/api';

import { useAsync } from './useAsync';

interface UsePartGradesLookupResult {
  partGrades: PartGrade[];
  partGradesById: Map<number, PartGrade>;
  isLoading: boolean;
  error: unknown;
}

const NO_PART_GRADES: PartGrade[] = [];

export function usePartGradesLookup(): UsePartGradesLookupResult {
  // Sorted by (displayOrder, name) because partGradeTone maps rank in this list to a tone.
  const fetcher = useCallback(
    () =>
      listPartGrades({ limit: 100 }).then((page) =>
        [...page.data].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
      ),
    [],
  );
  const { data, isLoading, error } = useAsync(fetcher);
  const partGrades = data ?? NO_PART_GRADES;
  const partGradesById = useMemo(
    () => new Map(partGrades.map((grade) => [grade.id, grade])),
    [partGrades],
  );

  return { partGrades, partGradesById, isLoading, error };
}
