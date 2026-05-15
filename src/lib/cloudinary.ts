import { createHash } from "node:crypto";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder: string;
};

type CloudinaryDeleteResult = {
  result?: string;
};

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const uploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "weddings";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadFolder,
  };
}

function buildSignatureString(params: Record<string, string | number>) {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function signParameters(params: Record<string, string | number>, apiSecret: string) {
  const payload = `${buildSignatureString(params)}${apiSecret}`;
  return createHash("sha1").update(payload).digest("hex");
}

function buildWeddingCoverPublicId(weddingId: string) {
  const safeWeddingId = weddingId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `wedding-cover-${safeWeddingId}-${Date.now()}`;
}

export function buildWeddingCoverUploadSignature(weddingId: string) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = buildWeddingCoverPublicId(weddingId);

  const signatureParams = {
    folder: config.uploadFolder,
    public_id: publicId,
    timestamp,
  };

  const signature = signParameters(signatureParams, config.apiSecret);

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    timestamp,
    signature,
    folder: config.uploadFolder,
    publicId,
  };
}

export function isValidCloudinaryAssetUrl(urlValue: string) {
  const config = getCloudinaryConfig();

  try {
    const parsed = new URL(urlValue);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.includes(`/${config.cloudName}/`)
    );
  } catch {
    return false;
  }
}

export async function deleteCloudinaryAsset(publicId: string) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParameters(
    {
      public_id: publicId,
      timestamp,
    },
    config.apiSecret,
  );

  const formData = new URLSearchParams();
  formData.set("public_id", publicId);
  formData.set("timestamp", String(timestamp));
  formData.set("api_key", config.apiKey);
  formData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Cloudinary delete failed (${response.status}): ${body}`);
  }

  return (await response.json()) as CloudinaryDeleteResult;
}
