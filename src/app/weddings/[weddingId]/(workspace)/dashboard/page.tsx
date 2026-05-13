import { redirect } from "next/navigation";

type DashboardRedirectPageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function DashboardRedirectPage({ params }: DashboardRedirectPageProps) {
  const { weddingId } = await params;
  redirect(`/weddings/${weddingId}`);
}
