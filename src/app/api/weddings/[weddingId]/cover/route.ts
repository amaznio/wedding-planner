import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateWeddingCoverSchema } from "@/features/wedding/schemas/wedding.schema";
import { validationErrorResponse } from "@/lib/api-errors";
import { deleteCloudinaryAsset, isValidCloudinaryAssetUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { requireWeddingRole } from "@/lib/wedding-authz";

type RouteContext = {
  params: Promise<{ weddingId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  try {
    const body = await request.json();
    const payload = updateWeddingCoverSchema.parse(body);

    if (!isValidCloudinaryAssetUrl(payload.secureUrl)) {
      return NextResponse.json({ error: "Invalid Cloudinary asset URL" }, { status: 400 });
    }

    const existingWedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { id: true, coverImagePublicId: true },
    });

    if (!existingWedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const wedding = await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        coverImageUrl: payload.secureUrl,
        coverImagePublicId: payload.publicId,
        coverImageWidth: payload.width,
        coverImageHeight: payload.height,
        coverImageUploadedAt: new Date(),
      },
      select: {
        id: true,
        coverImageUrl: true,
        coverImagePublicId: true,
        coverImageWidth: true,
        coverImageHeight: true,
        coverImageUploadedAt: true,
      },
    });

    if (
      existingWedding.coverImagePublicId &&
      existingWedding.coverImagePublicId !== payload.publicId
    ) {
      try {
        await deleteCloudinaryAsset(existingWedding.coverImagePublicId);
      } catch (error) {
        console.error("Failed to delete previous Cloudinary wedding cover image", error);
      }
    }

    return NextResponse.json({ wedding, access: authz.access });
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return NextResponse.json({ error: "Failed to save wedding cover image" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { weddingId } = await context.params;
  const authz = await requireWeddingRole(weddingId, "editor");
  if (authz.response) return authz.response;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { id: true, coverImagePublicId: true },
  });

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  await prisma.wedding.update({
    where: { id: weddingId },
    data: {
      coverImageUrl: null,
      coverImagePublicId: null,
      coverImageWidth: null,
      coverImageHeight: null,
      coverImageUploadedAt: null,
    },
  });

  if (wedding.coverImagePublicId) {
    try {
      await deleteCloudinaryAsset(wedding.coverImagePublicId);
    } catch (error) {
      console.error("Failed to delete Cloudinary wedding cover image", error);
    }
  }

  return NextResponse.json({ success: true, access: authz.access });
}
