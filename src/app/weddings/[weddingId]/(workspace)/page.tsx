import { WeddingDashboardPage } from "@/features/wedding-dashboard/components/WeddingDashboardPage";

type WeddingDashboardRoutePageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingDashboardRoutePage({ params }: WeddingDashboardRoutePageProps) {
  const { weddingId } = await params;
  return <WeddingDashboardPage weddingId={weddingId} />;
}
