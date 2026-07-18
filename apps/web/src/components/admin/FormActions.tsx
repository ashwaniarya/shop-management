import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';

interface FormActionsProps {
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
}

// Save + Cancel + inline submit error, shared by every create/edit dialog form
// (manufacturer, supplier, vehicle class/make/model, shop, shop user, category, part).
export function FormActions({ submitLabel, isSubmitting, error, onCancel }: FormActionsProps) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={onCancel}>
        Cancel
      </Button>
      <FormError error={error} />
    </div>
  );
}
