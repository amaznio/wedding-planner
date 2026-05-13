import { WeddingGuestsPage } from "@/features/wedding-guests/components/WeddingGuestsPage";

type WeddingGuestsRoutePageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingGuestsRoutePage({ params }: WeddingGuestsRoutePageProps) {
  const { weddingId } = await params;
  return <WeddingGuestsPage weddingId={weddingId} />;
}

