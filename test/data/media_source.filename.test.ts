import { describe, it, expect } from "vitest";
import { isValidUploadFilename } from "../../src/data/media_source";

describe("isValidUploadFilename", () => {
  it("allows simple filenames", () => {
    expect(isValidUploadFilename("photo.jpg")).toBe(true);
    expect(isValidUploadFilename("my.video.mp4")).toBe(true);
    expect(isValidUploadFilename("a.b")).toBe(true);
    expect(isValidUploadFilename(".env")).toBe(true);
  });

  it("blocks filenames with consecutive dots anywhere", () => {
    expect(isValidUploadFilename("..")).toBe(false);
    expect(isValidUploadFilename("a..b")).toBe(false);
    expect(isValidUploadFilename("../x.jpg")).toBe(false);
    expect(isValidUploadFilename("x..")).toBe(false);
    expect(isValidUploadFilename("folder..name.png")).toBe(false);
  });
});
