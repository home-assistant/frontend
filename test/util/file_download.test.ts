import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fileDownload } from "../../src/util/file_download";

describe("fileDownload", () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;
  let createdElement: HTMLAnchorElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    createdElement = document.createElement("a");
    vi.spyOn(createdElement, "dispatchEvent");
    vi.spyOn(document, "createElement").mockReturnValue(createdElement);
    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation((node) => node);
    dispatchEventSpy = vi.spyOn(createdElement, "dispatchEvent");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).externalApp;
  });

  it("sets href, download, and triggers a click", () => {
    fileDownload("https://example.com/file.json", "file.json");

    expect(createdElement.href).toBe("https://example.com/file.json");
    expect(createdElement.download).toBe("file.json");
    expect(appendChildSpy).toHaveBeenCalledWith(createdElement);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(MouseEvent));
    expect(removeChildSpy).toHaveBeenCalledWith(createdElement);
  });

  it("defaults filename to empty string", () => {
    fileDownload("https://example.com/file.json");
    expect(createdElement.download).toBe("");
  });

  it("does not revoke non-blob URLs", () => {
    fileDownload("https://example.com/file.json", "file.json");
    vi.runAllTimers();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("revokes blob URLs immediately outside Android", () => {
    fileDownload("blob:http://localhost/abc-123", "file.json");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/abc-123"
    );
  });

  it("revokes blob URL after delay on Android", () => {
    (window as any).externalApp = {};
    fileDownload("blob:http://localhost/abc-123", "file.json");
    vi.advanceTimersByTime(9_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/abc-123"
    );
  });
});
