'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useAsync } from '@/hooks/useAsync';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createPartSupplier, deletePartSupplier, listSuppliers, updatePartSupplier, type SupplierPartExpanded } from '@/lib/api';
import { supplierPartCreateSchema, supplierPartUpdateSchema } from '@shop/shared';

function PreferredStar({ isPreferred }: { isPreferred: boolean }) {
  return (
    <span aria-label={isPreferred ? 'Preferred supplier' : 'Not preferred'} className={isPreferred ? 'text-accent-400' : 'text-ink-700'}>
      ★
    </span>
  );
}

interface SuppliersSectionProps {
  partId: number;
  suppliers: SupplierPartExpanded[];
  onMutated: () => void;
}

export function SuppliersSection({ partId, suppliers, onMutated }: SuppliersSectionProps) {
  const suppliersFetcher = useCallback(() => listSuppliers({ limit: 100 }).then((page) => page.data), []);
  const { data: supplierOptions } = useAsync(suppliersFetcher);

  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [supplierPartNumber, setSupplierPartNumber] = useState('');
  const [isPreferred, setIsPreferred] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editPreferred, setEditPreferred] = useState(false);

  const addSubmit = useZodSubmit(supplierPartCreateSchema, (data) => createPartSupplier(partId, data), {
    onSuccess: () => {
      setSupplierId('');
      setSupplierPartNumber('');
      setIsPreferred(false);
      onMutated();
    },
  });

  const editSubmit = useZodSubmit(
    supplierPartUpdateSchema,
    (data) =>
      editingId === null
        ? Promise.reject(new Error('No supplier link selected'))
        : updatePartSupplier(partId, editingId, data),
    {
      onSuccess: () => {
        setEditingId(null);
        onMutated();
      },
    },
  );

  function handleAddSubmit(event: React.FormEvent) {
    event.preventDefault();
    addSubmit.run({
      supplierId: supplierId === '' ? undefined : supplierId,
      supplierPartNumber: supplierPartNumber.trim() === '' ? undefined : supplierPartNumber.trim(),
      isPreferred,
    });
  }

  function startEdit(supplierPart: SupplierPartExpanded) {
    setEditingId(supplierPart.id);
    setEditNumber(supplierPart.supplierPartNumber ?? '');
    setEditPreferred(supplierPart.isPreferred);
    editSubmit.reset();
  }

  function saveEdit() {
    editSubmit.run({
      supplierPartNumber: editNumber.trim() === '' ? null : editNumber.trim(),
      isPreferred: editPreferred,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {suppliers.length === 0 ? (
        <EmptyState title="No suppliers linked" description="Link this part to at least one supplier to track sourcing." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>Supplier part #</Th>
              <Th>Preferred</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplierPart) => {
              const isEditing = editingId === supplierPart.id;
              return (
                <Tr key={supplierPart.id}>
                  <Td>{supplierPart.supplierName}</Td>
                  <Td mono>
                    {isEditing ? (
                      <Input
                        aria-label="Supplier part number"
                        value={editNumber}
                        onChange={(event) => setEditNumber(event.target.value)}
                        error={editSubmit.fieldErrors.supplierPartNumber}
                        className="h-7 text-xs"
                      />
                    ) : (
                      (supplierPart.supplierPartNumber ?? '—')
                    )}
                  </Td>
                  <Td>
                    {isEditing ? (
                      <label className="inline-flex items-center gap-1.5 text-xs text-ink-300">
                        <input
                          type="checkbox"
                          checked={editPreferred}
                          onChange={(event) => setEditPreferred(event.target.checked)}
                          className="h-3.5 w-3.5 accent-accent-500"
                        />
                        Preferred
                      </label>
                    ) : (
                      <PreferredStar isPreferred={supplierPart.isPreferred} />
                    )}
                  </Td>
                  <Td align="right">
                    {isEditing ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Button variant="primary" size="sm" isLoading={editSubmit.isSubmitting} onClick={saveEdit}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" disabled={editSubmit.isSubmitting} onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <FormError error={editSubmit.fieldErrors.isPreferred ?? editSubmit.submitError} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(supplierPart)}>
                          Edit
                        </Button>
                        <ConfirmButton onConfirm={() => deletePartSupplier(partId, supplierPart.id).then(onMutated)} />
                      </span>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 rounded-md border border-dashed border-ink-700 p-4">
        <p className="text-xs font-medium tracking-wide text-ink-300 uppercase">Link a supplier</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Supplier"
            required
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value === '' ? '' : Number(event.target.value))}
            error={addSubmit.fieldErrors.supplierId}
          >
            <option value="">Select a supplier…</option>
            {(supplierOptions ?? []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
          <Input
            label="Supplier part #"
            placeholder="Optional"
            value={supplierPartNumber}
            onChange={(event) => setSupplierPartNumber(event.target.value)}
            error={addSubmit.fieldErrors.supplierPartNumber}
            className="font-mono"
          />
          <div className="flex items-end pb-2">
            <label className="inline-flex items-center gap-1.5 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={isPreferred}
                onChange={(event) => setIsPreferred(event.target.checked)}
                className="h-3.5 w-3.5 accent-accent-500"
              />
              Preferred supplier
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" size="sm" isLoading={addSubmit.isSubmitting}>
            Link supplier
          </Button>
          <FormError error={addSubmit.submitError} />
        </div>
      </form>
    </div>
  );
}
