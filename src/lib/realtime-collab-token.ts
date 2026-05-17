import { createHmac } from "node:crypto";

type RealtimeTokenPayload = {
  sub: string | null;
  planId: string;
  role: "owner" | "editor" | "viewer" | "public_viewer";
  canEdit: boolean;
  exp: number;
  iat: number;
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function issueRealtimeToken(payload: Omit<RealtimeTokenPayload, "iat" | "exp">): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for realtime token signing");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload: RealtimeTokenPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + 60 * 15,
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  const encodedSignature = base64url(signature);

  return `${signingInput}.${encodedSignature}`;
}
