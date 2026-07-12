import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Normalize an answer so casing/whitespace don't matter. */
function normalize(answer: string): string {
  return answer.trim().toLowerCase();
}

/** Hash an answer with a fresh random salt. Stored as "salt:hash" (hex). */
export function hashAnswer(answer: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalize(answer), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify an answer against a stored "salt:hash" value. */
export function verifyAnswer(answer: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(normalize(answer), salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
