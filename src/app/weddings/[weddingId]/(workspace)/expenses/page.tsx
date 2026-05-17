import { redirect } from "next/navigation";

type WeddingExpensesRedirectPageProps = {
  params: Promise<{ weddingId: string }>;
};

export default async function WeddingExpensesRedirectPage({ params }: WeddingExpensesRedirectPageProps) {
  const { weddingId } = await params;
  redirect(`/weddings/${weddingId}/budget`);
}
