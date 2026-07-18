import type { PartFitmentExpanded } from '@/lib/api';

function describeFitment(fitment: PartFitmentExpanded): string {
  return [fitment.vehicleClassName, fitment.vehicleMakeName, fitment.vehicleModelName]
    .filter((segment): segment is string => Boolean(segment))
    .join(' · ');
}

// An empty fitment list is a deliberate "fits everything" declaration in this catalog
// (e.g. the multipurpose grease in the seed data), not missing data, so it reads as
// "All vehicles" rather than a blank cell.
export function summarizeFitments(fitments: PartFitmentExpanded[]): string {
  if (fitments.length === 0) {
    return 'All vehicles';
  }

  const [first, ...rest] = fitments.map(describeFitment);
  return rest.length === 0 ? first : `${first} +${rest.length} more`;
}
