/**
 * Source-level checks for the GDPR account routes — verifies they import
 * the right primitives and enforce the safety contracts the design promises.
 * Full request-level coverage would require mocking auth, db, and storage;
 * keeping these as static guards catches the most likely regressions
 * (accidentally removing the auth check, the email-confirm gate, or the
 * pre-delete image cleanup) without the maintenance burden.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const exportSrc = readFileSync(path.resolve("src/app/api/account/export/route.ts"), "utf8");
const deleteSrc = readFileSync(path.resolve("src/app/api/account/delete/route.ts"), "utf8");

describe("account/export route", () => {
  it("requires authentication", () => {
    expect(exportSrc).toMatch(/auth\.api\.getSession/);
    expect(exportSrc).toMatch(/status:\s*401/);
  });

  it("scopes every table query to session.user.id", () => {
    // The route reads from seven tables; each select must be filtered by the
    // session user, otherwise it would leak other users' data.
    const userTables = ["userProfile", "workouts", "dailyStats", "goals", "meals", "achievements"];
    for (const tbl of userTables) {
      // matches `.from(tbl).where(eq(tbl.userId, userId))` with any whitespace
      const re = new RegExp(`\\.from\\(${tbl}\\)[\\s\\S]*?eq\\(${tbl}\\.userId,\\s*userId\\)`);
      expect(exportSrc, `${tbl} must be filtered by userId`).toMatch(re);
    }
  });

  it("forces a download with Content-Disposition: attachment", () => {
    expect(exportSrc).toMatch(/Content-Disposition.*attachment/);
  });

  it("does not export auth/session tables", () => {
    // These contain credentials and tokens that must never leave the server.
    expect(exportSrc).not.toMatch(/from\s*\(\s*session\s*\)/);
    expect(exportSrc).not.toMatch(/from\s*\(\s*account\s*\)/);
    expect(exportSrc).not.toMatch(/from\s*\(\s*verification\s*\)/);
  });
});

describe("account/delete route", () => {
  it("requires authentication", () => {
    expect(deleteSrc).toMatch(/auth\.api\.getSession/);
    expect(deleteSrc).toMatch(/status:\s*401/);
  });

  it("validates the body with Zod and requires an email field", () => {
    expect(deleteSrc).toMatch(/from\s+["']zod["']/);
    expect(deleteSrc).toMatch(/email:\s*z\.string\(\)\.email\(\)/);
  });

  it("rejects the request when confirmation email doesn't match the session", () => {
    // The case-insensitive comparison is the safety gate — if a refactor
    // dropped it, a stray fetch could nuke the account.
    expect(deleteSrc).toMatch(
      /email\.toLowerCase\(\)\s*!==\s*session\.user\.email\.toLowerCase\(\)/
    );
    expect(deleteSrc).toMatch(/Email confirmation does not match/);
  });

  it("cleans up meal images before deleting the user", () => {
    // Storage blobs don't cascade with FK constraints, so we must enumerate
    // and delete them explicitly. The order also matters: collect URLs
    // BEFORE the cascade wipes the rows.
    expect(deleteSrc).toMatch(/deleteFile/);
    const imageCleanupIdx = deleteSrc.indexOf("deleteFile");
    const userDeleteIdx = deleteSrc.indexOf("db.delete(user)");
    expect(imageCleanupIdx, "image cleanup must come before user deletion").toBeLessThan(
      userDeleteIdx
    );
  });

  it("deletes the user row to trigger FK cascade", () => {
    expect(deleteSrc).toMatch(/db\.delete\(user\)[\s\S]*eq\(user\.id,\s*userId\)/);
  });
});
