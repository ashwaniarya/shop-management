import { PartDetailView } from './PartDetailView';

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartDetailView partId={Number(id)} />;
}
