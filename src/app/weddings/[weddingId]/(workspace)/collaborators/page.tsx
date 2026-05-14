import { WeddingCollaboratorsPage } from "@/features/wedding-collaborators/components/WeddingCollaboratorsPage";

type WeddingCollaboratorsRoutePageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingCollaboratorsRoutePage({
  params,
}: WeddingCollaboratorsRoutePageProps) {
  const { weddingId } = await params;
  return <WeddingCollaboratorsPage weddingId={weddingId} />;
}
