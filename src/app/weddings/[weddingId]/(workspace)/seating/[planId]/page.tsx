import { redirect } from "next/navigation";
import { requireSeatingPlanRole } from "@/lib/wedding-authz";
import { getWeddingRoutes } from "@/lib/routes";
import { SeatingPlanEditorScreen } from "@/app/seating-plans/[planId]/page";

type WeddingSeatingEditorRoutePageProps = {
  params: Promise<{ weddingId: string; planId: string }>;
};

export default async function WeddingSeatingEditorRoutePage({ params }: WeddingSeatingEditorRoutePageProps) {
  const { weddingId, planId } = await params;
  const authz = await requireSeatingPlanRole(planId, "viewer");

  if (authz.response) {
    if (authz.response.status === 401) {
      redirect("/sign-in");
    }
    redirect(getWeddingRoutes(weddingId).seating);
  }

  if (authz.weddingId && authz.weddingId !== weddingId) {
    redirect(`${getWeddingRoutes(weddingId).seating}?planMismatch=1`);
  }

  return <SeatingPlanEditorScreen />;
}
