'use client';

import { Input } from '@/components/ui/Input';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface PosCustomerFieldsProps {
  customerName: string;
  customerPhone: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
}

export function PosCustomerFields({
  customerName,
  customerPhone,
  onCustomerNameChange,
  onCustomerPhoneChange,
}: PosCustomerFieldsProps) {
  return (
    <section className="rounded-md border border-ink-800 bg-ink-900 p-4">
      <SectionHeading>Customer (optional)</SectionHeading>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Name" placeholder="Walk-in" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} />
        <Input
          label="Phone"
          placeholder="Optional"
          type="tel"
          inputMode="tel"
          value={customerPhone}
          onChange={(event) => onCustomerPhoneChange(event.target.value)}
        />
      </div>
    </section>
  );
}
