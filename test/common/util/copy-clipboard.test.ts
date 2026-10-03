import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "../../../src/common/util/copy-clipboard";

const deepActiveElement = vi.hoisted(() => vi.fn());

vi.mock("../../../src/common/dom/deep-active-element", () => ({
  deepActiveElement,
}));

describe("copyToClipboard", () => {
  const originalClipboard = navigator.clipboard;
  const hadExecCommand = "execCommand" in document;

  const setClipboard = (value: unknown) => {
    Object.defineProperty(navigator, "clipboard", {
      value,
      configurable: true,
    });
  };

  // jsdom does not implement execCommand, so provide a stub for the fallback.
  const stubExecCommand = () => {
    const execCommand = vi.fn().mockReturnValue(true);
    (document as any).execCommand = execCommand;
    return execCommand;
  };

  beforeEach(() => {
    deepActiveElement.mockReset();
  });

  afterEach(() => {
    setClipboard(originalClipboard);
    if (!hadExecCommand) {
      delete (document as any).execCommand;
    }
    vi.restoreAllMocks();
  });

  it("uses the async clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await copyToClipboard("hello");

    expect(writeText).toHaveBeenCalledWith("hello");
    // The fallback should not run when the async API succeeds.
    expect(deepActiveElement).not.toHaveBeenCalled();
  });

  it("falls back without throwing when the active element is in the light DOM", async () => {
    setClipboard(undefined);
    const execCommand = stubExecCommand();
    // An element in the main document: getRootNode() returns the document,
    // which cannot have a textarea appended to it directly.
    const lightEl = document.createElement("div");
    document.body.appendChild(lightEl);
    deepActiveElement.mockReturnValue(lightEl);

    const appendSpy = vi.spyOn(document.body, "appendChild");

    await expect(copyToClipboard("hello")).resolves.toBeUndefined();

    expect(appendSpy).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith("copy");
    // The temporary textarea is cleaned up.
    expect(document.body.querySelector("textarea")).toBeNull();

    document.body.removeChild(lightEl);
  });

  it("appends into the shadow root when the active element lives in one", async () => {
    setClipboard(undefined);
    stubExecCommand();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const shadowEl = document.createElement("span");
    shadow.appendChild(shadowEl);
    deepActiveElement.mockReturnValue(shadowEl);

    const shadowAppend = vi.spyOn(shadow, "appendChild");

    await copyToClipboard("hello");

    expect(shadowAppend).toHaveBeenCalled();
    // The temporary textarea is cleaned up.
    expect(shadow.querySelector("textarea")).toBeNull();

    document.body.removeChild(host);
  });
});
