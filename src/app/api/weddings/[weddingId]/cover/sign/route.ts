import { NextResponse } from "next/server";

import { buildWeddingCoverUploadSignature } from "@/lib/cloudinary";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const signedUpload = buildWeddingCoverUploadSignature(weddingId);
    return NextResponse.json({ signedUpload, access: authz.access });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create upload signature",
      },
      { status: 500 },
    );
  }
}
