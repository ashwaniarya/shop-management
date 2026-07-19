'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { PartActiveBadge } from '@/components/PartActiveBadge';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useAsync } from '@/hooks/useAsync';
import { getPartFamily } from '@/lib/api';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { partGradeTone } from '@/lib/partGradeTone';
import type { PartGrade } from '@shop/shared';

interface GradesSectionProps {
  partId: number;
  shopId: number | null;
  partGrades: PartGrade[];
}

export function GradesSection({ partId, shopId, partGrades }: GradesSectionProps) {
  const familyFetcher = useCallback(() => getPartFamily(partId, shopId ?? undefined), [partId, shopId]);
  const { data: family, isLoading, error, retry: refetchFamily } = useAsync(familyFetcher);

  if (isLoading) {
    return <LoadingBlock label="Loading part family…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={refetchFamily} title="Could not load the part family" />;
  }
  if (!family) {
    return null;
  }

  if (family.copies.length === 0) {
    return (
      <EmptyState
        title="No copies linked to this part"
        description="Mark a part as a copy of this one via the part form's 'Copy of' field to compare originals and copies here."
      />
    );
  }

  const familyMembers = [family.original, ...family.copies];
  const showStockColumns = shopId !== null;

  return (
    <Table>
      <thead>
        <tr>
          <Th>SKU</Th>
          <Th>Name</Th>
          <Th>Grade</Th>
          <Th align="right">MRP</Th>
          {showStockColumns ? (
            <>
              <Th align="right">On hand</Th>
              <Th align="right">Price</Th>
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {familyMembers.map((member) => (
          <Tr key={member.id} className={member.isActive ? undefined : 'opacity-60'}>
            <Td mono>
              {member.id === partId ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-ink-100">{member.sku}</span>
                  <Badge tone="muted">Viewing</Badge>
                </span>
              ) : (
                <Link href={`/parts/${member.id}`} className="text-ink-100 hover:text-accent-400">
                  {member.sku}
                </Link>
              )}
            </Td>
            <Td>
              <span className="inline-flex items-center gap-2">
                {member.name}
                {member.isActive ? null : <PartActiveBadge isActive={member.isActive} />}
              </span>
            </Td>
            <Td>
              {member.gradeId !== null && member.gradeName !== null ? (
                <Badge tone={partGradeTone(member.gradeId, partGrades)}>{member.gradeName}</Badge>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </Td>
            <Td align="right" mono>
              {formatCurrency(member.mrp)}
            </Td>
            {showStockColumns ? (
              <>
                <Td align="right" mono>
                  {typeof member.quantityOnHand === 'number' ? formatQuantity(member.quantityOnHand) : '—'}
                </Td>
                <Td align="right" mono className="text-ink-400">
                  {formatCurrency(member.sellingPrice)}
                </Td>
              </>
            ) : null}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
