import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTerraSignature } from "@/lib/terra";

const SECRET = "test-webhook-secret";

function signedHeader(body: string, ts: number, secret = SECRET): string {
  const mac = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${mac}`;
}

describe("verifyTerraSignature", () => {
  const body = '{"type":"auth","user":{"user_id":"abc","reference_id":"u123"}}';
  const now = 1_700_000_000;

  it("accepts a correctly signed request inside the time window", () => {
    const header = signedHeader(body, now);
    expect(verifyTerraSignature(header, body, SECRET, now)).toEqual({ ok: true });
  });

  it("accepts a signature timestamped slightly in the past (within 5 min)", () => {
    const header = signedHeader(body, now - 60);
    expect(verifyTerraSignature(header, body, SECRET, now)).toEqual({ ok: true });
  });

  it("rejects a signature older than the 5 minute skew window", () => {
    const header = signedHeader(body, now - 6 * 60);
    const result = verifyTerraSignature(header, body, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/window/i);
  });

  it("rejects a future signature beyond the skew window", () => {
    const header = signedHeader(body, now + 6 * 60);
    expect(verifyTerraSignature(header, body, SECRET, now).ok).toBe(false);
  });

  it("rejects a body that has been tampered with", () => {
    const header = signedHeader(body, now);
    const tampered = body.replace("abc", "xyz");
    const result = verifyTerraSignature(header, tampered, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/signature mismatch/);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const header = signedHeader(body, now, "different-secret");
    expect(verifyTerraSignature(header, body, SECRET, now).ok).toBe(false);
  });

  it("rejects a missing header", () => {
    const result = verifyTerraSignature(null, body, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/missing/i);
  });

  it("rejects a header missing the t component", () => {
    const result = verifyTerraSignature("v1=deadbeef", body, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/malformed/i);
  });

  it("rejects a header missing the v1 component", () => {
    const result = verifyTerraSignature(`t=${now}`, body, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/malformed/i);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual would throw on unequal buffer lengths — verifier must
    // bail first.
    const result = verifyTerraSignature(`t=${now},v1=abc`, body, SECRET, now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/length/i);
  });

  it("ignores unknown signature versions in the header", () => {
    // Header carries extra junk + the real v1 — we accept anyway.
    const goodHeader = signedHeader(body, now);
    const augmented = `v2=should-be-ignored,${goodHeader}`;
    expect(verifyTerraSignature(augmented, body, SECRET, now)).toEqual({ ok: true });
  });
});
