import { WeddingEventDetailPage } from "@/features/wedding-events/components/WeddingEventDetailPage";

type WeddingEventRoutePageProps = {
  params: Promise<{ weddingId: string; eventId: string }>;
};

export default async function WeddingEventRoutePage({ params }: WeddingEventRoutePageProps) {
  const { weddingId, eventId } = await params;
  return <WeddingEventDetailPage weddingId={weddingId} eventId={eventId} />;
}
