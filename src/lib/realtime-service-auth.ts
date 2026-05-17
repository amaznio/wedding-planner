import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isTrustedRealtimeServiceRequest(request: Request): boolean {
  const expectedToken = process.env.REALTIME_SERVICE_TOKEN;
  if (!expectedToken) return false;

  const providedToken = request.headers.get("x-realtime-service-token");
  if (!providedToken) return false;

  return safeEqual(providedToken, expectedToken);
}
