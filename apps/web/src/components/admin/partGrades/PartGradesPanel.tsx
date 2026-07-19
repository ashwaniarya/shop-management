'use client';

import { activeStatusColumn, AdminLookupPanel, type AdminLookupColumn } from '@/components/admin/AdminLookupPanel';
import { listPartGrades, softDeletePartGrade, updatePartGrade } from '@/lib/api';
import type { PartGrade } from '@shop/shared';

import { PartGradeFormDialog } from './PartGradeFormDialog';

const COLUMNS: AdminLookupColumn<PartGrade>[] = [
  { header: 'Name', cell: (partGrade) => partGrade.name },
  {
    header: 'Display order',
    headerAlign: 'right',
    align: 'right',
    mono: true,
    cellClassName: 'text-ink-400',
    cell: (partGrade) => partGrade.displayOrder,
  },
  activeStatusColumn(),
];

export function PartGradesPanel() {
  return (
    <AdminLookupPanel
      entityLabel="grade"
      entityLabelPlural="grades"
      columns={COLUMNS}
      listItems={listPartGrades}
      softDeleteItem={softDeletePartGrade}
      updateItem={updatePartGrade}
      renderFormDialog={({ item, isOpen, onClose, onSaved }) => (
        <PartGradeFormDialog partGrade={item} isOpen={isOpen} onClose={onClose} onSaved={onSaved} />
      )}
    />
  );
}
