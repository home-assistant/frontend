import { describe, expect, it } from "vitest";
import { isSupportedBackupFile } from "../../src/data/backup";

const makeFile = (name: string, type: string): File =>
  new File([""], name, { type });

describe("isSupportedBackupFile", () => {
  it("accepts a .tar with the correct MIME type", () => {
    expect(
      isSupportedBackupFile(makeFile("backup.tar", "application/x-tar"))
    ).toBe(true);
  });

  it("accepts a .tar when the browser reports no MIME type (Firefox on Windows)", () => {
    expect(isSupportedBackupFile(makeFile("backup.tar", ""))).toBe(true);
  });

  it("accepts a .tar reported as a generic binary type", () => {
    expect(
      isSupportedBackupFile(makeFile("backup.tar", "application/octet-stream"))
    ).toBe(true);
  });

  it("accepts regardless of extension casing", () => {
    expect(isSupportedBackupFile(makeFile("BACKUP.TAR", ""))).toBe(true);
  });

  it("rejects a non-tar file", () => {
    expect(isSupportedBackupFile(makeFile("photo.png", "image/png"))).toBe(
      false
    );
  });
});
