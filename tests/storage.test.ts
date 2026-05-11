import { describe, it, expect } from "vitest";
import { sanitizeFilename, validateFile } from "@/lib/storage";

// Pure-function coverage for the security-sensitive parts of the storage
// module: sanitizeFilename and validateFile. The upload/deleteFile paths
// branch on env (Vercel Blob vs local fs) and would need filesystem or
// network mocking — covered separately if/when that risk shows up.

describe("sanitizeFilename: path traversal", () => {
  it("strips POSIX path components", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("/abs/path/to/file.png")).toBe("file.png");
  });

  it("strips Windows path components", () => {
    expect(sanitizeFilename("..\\..\\windows\\system32\\evil.exe")).toBe("evil.exe");
    expect(sanitizeFilename("C:\\Users\\foo\\file.txt")).toBe("file.txt");
  });
});

describe("sanitizeFilename: dangerous characters", () => {
  it("removes control characters and null bytes", () => {
    expect(sanitizeFilename("file\x00.png")).toBe("file.png");
    expect(sanitizeFilename("file\x1f.png")).toBe("file.png");
  });

  it("removes shell-unsafe characters", () => {
    expect(sanitizeFilename('file"with"quotes.png')).toBe("filewithquotes.png");
    expect(sanitizeFilename("file<script>.png")).toBe("filescript.png");
    expect(sanitizeFilename("file|pipe.png")).toBe("filepipe.png");
    expect(sanitizeFilename("file?wild*card.png")).toBe("filewildcard.png");
  });

  it("collapses runs of consecutive dots", () => {
    expect(sanitizeFilename("file....png")).toBe("file.png");
  });

  it("strips leading dots (no hidden files)", () => {
    expect(sanitizeFilename(".htaccess")).toBe("htaccess");
    expect(sanitizeFilename("...env")).toBe("env");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeFilename("  file.png  ")).toBe("file.png");
  });
});

describe("sanitizeFilename: empty / unrecoverable input", () => {
  it("throws when the result would be empty", () => {
    expect(() => sanitizeFilename("")).toThrow("Invalid filename");
    expect(() => sanitizeFilename("....")).toThrow("Invalid filename");
    expect(() => sanitizeFilename('<<>>""||??**')).toThrow("Invalid filename");
  });
});

describe("sanitizeFilename: length cap", () => {
  it("preserves filenames at the 255-char boundary", () => {
    const name = "a".repeat(251) + ".png"; // 255 chars
    expect(sanitizeFilename(name).length).toBe(255);
  });

  it("truncates over-long names while preserving the extension", () => {
    const name = "a".repeat(300) + ".png"; // 304 chars
    const out = sanitizeFilename(name);
    expect(out.length).toBe(255);
    expect(out.endsWith(".png")).toBe(true);
  });
});

describe("validateFile: size", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  it("accepts a file at the size limit", () => {
    const buf = Buffer.alloc(1024);
    const r = validateFile(buf, "ok.png", { maxSize: 1024 });
    expect(r.valid).toBe(true);
  });

  it("rejects a file one byte over the limit", () => {
    const buf = Buffer.alloc(1025);
    const r = validateFile(buf, "too-big.png", { maxSize: 1024 });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/too large/i);
  });

  it("uses 5MB default when no maxSize given", () => {
    const sixMb = Buffer.alloc(6 * 1024 * 1024);
    const r = validateFile(sixMb, "huge.png");
    expect(r.valid).toBe(false);
  });

  it("accepts an empty buffer at default config (size 0 ≤ max)", () => {
    expect(validateFile(Buffer.alloc(0), "empty.png").valid).toBe(true);
    expect(validateFile(png, "ok.png").valid).toBe(true);
  });
});

describe("validateFile: extension allow-list", () => {
  const buf = Buffer.alloc(10);

  it("accepts standard image and document extensions", () => {
    for (const ext of [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"]) {
      expect(validateFile(buf, `file${ext}`).valid, ext).toBe(true);
    }
  });

  it("accepts uppercase extensions (case-insensitive)", () => {
    expect(validateFile(buf, "PHOTO.PNG").valid).toBe(true);
    expect(validateFile(buf, "report.PDF").valid).toBe(true);
  });

  it("rejects executable extensions", () => {
    for (const ext of [".exe", ".sh", ".bat", ".dll", ".js"]) {
      const r = validateFile(buf, `evil${ext}`);
      expect(r.valid, ext).toBe(false);
    }
  });

  it("rejects files with no extension", () => {
    const r = validateFile(buf, "no-extension");
    expect(r.valid).toBe(false);
  });

  it("rejects double-extension trick (.png.exe)", () => {
    // Only the last extension matters; .exe is not allowed.
    expect(validateFile(buf, "photo.png.exe").valid).toBe(false);
  });
});
