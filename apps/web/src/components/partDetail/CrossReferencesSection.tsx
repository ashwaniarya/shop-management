'use client';

import { useState } from 'react';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { createPartCrossReference, deletePartCrossReference } from '@/lib/api';
import { getFieldErrors } from '@/lib/zodFieldErrors';
import { partCrossReferenceCreateSchema, refTypeSchema, type PartCrossReference, type RefType } from '@shop/shared';

const REF_TYPE_TONE: Record<RefType, BadgeTone> = {
  OEM: 'positive',
  COMPETITOR: 'neutral',
  SUPERSEDES: 'accent',
  ALTERNATE: 'muted',
};

const REF_TYPE_OPTIONS = refTypeSchema.options;

interface CrossReferencesSectionProps {
  partId: number;
  crossReferences: PartCrossReference[];
  onMutated: () => void;
}

export function CrossReferencesSection({ partId, crossReferences, onMutated }: CrossReferencesSectionProps) {
  const [refType, setRefType] = useState<RefType>('OEM');
  const [refNumber, setRefNumber] = useState('');
  const [refBrand, setRefBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = partCrossReferenceCreateSchema.safeParse({
      refType,
      refNumber: refNumber.trim(),
      refBrand: refBrand.trim() === '' ? undefined : refBrand.trim(),
      notes: notes.trim() === '' ? undefined : notes.trim(),
    });

    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    createPartCrossReference(partId, parsed.data)
      .then(() => {
        setRefNumber('');
        setRefBrand('');
        setNotes('');
        onMutated();
      })
      .catch((error: unknown) => setSubmitError(describeError(error)))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <div className="flex flex-col gap-4">
      {crossReferences.length === 0 ? (
        <EmptyState title="No cross-references recorded" description="OEM, competitor and alternate numbers will show up here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Number</Th>
              <Th>Brand</Th>
              <Th>Notes</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {crossReferences.map((crossReference) => (
              <Tr key={crossReference.id}>
                <Td>
                  <Badge tone={REF_TYPE_TONE[crossReference.refType]}>{crossReference.refType}</Badge>
                </Td>
                <Td mono>{crossReference.refNumber}</Td>
                <Td className="text-ink-400">{crossReference.refBrand ?? '—'}</Td>
                <Td className="text-ink-400">{crossReference.notes ?? '—'}</Td>
                <Td align="right">
                  <ConfirmButton onConfirm={() => deletePartCrossReference(partId, crossReference.id).then(onMutated)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-dashed border-ink-700 p-4">
        <p className="text-xs font-medium tracking-wide text-ink-300 uppercase">Add cross-reference</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Type" value={refType} onChange={(event) => setRefType(event.target.value as RefType)}>
            {REF_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Input
            label="Number"
            required
            value={refNumber}
            onChange={(event) => setRefNumber(event.target.value)}
            error={fieldErrors.refNumber}
            className="font-mono"
          />
          <Input label="Brand" placeholder="Optional" value={refBrand} onChange={(event) => setRefBrand(event.target.value)} />
          <Input label="Notes" placeholder="Optional" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Add cross-reference
          </Button>
          {submitError ? <span className="font-mono text-xs text-accent-400">{submitError}</span> : null}
        </div>
      </form>
    </div>
  );
}
