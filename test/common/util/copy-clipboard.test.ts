import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "../../../src/common/util/copy-clipboard";

vi.mock("../../../src/common/dom/deep-active-element", () => ({
  deepActiveElement: vi.fn(),
}));

// Must import after vi.mock so we get the mocked version
const { deepActiveElement } =
  await import("../../../src/common/dom/deep-active-element");

describe("copyToClipboard", () => {
  let execCommandMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom doesn't implement execCommand (deprecated API), so define it manually
    execCommandMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      value: execCommandMock,
      writable: true,
      configurable: true,
    });
    // navigator is set to {} by setup.ts, so navigator.clipboard is undefined by default
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("navigator.clipboard path", () => {
    it("uses clipboard API when it succeeds", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      await copyToClipboard("hello");

      expect(writeText).toHaveBeenCalledWith("hello");
      expect(execCommandMock).not.toHaveBeenCalled();
    });

    it("falls back to textarea when clipboard API throws", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      vi.mocked(deepActiveElement).mockReturnValue(null);

      await copyToClipboard("hello");

      expect(writeText).toHaveBeenCalledWith("hello");
      expect(execCommandMock).toHaveBeenCalledWith("copy");
    });
  });

  describe("fallback textarea root selection (no navigator.clipboard)", () => {
    it("appends to document.body when there is no active element", async () => {
      vi.mocked(deepActiveElement).mockReturnValue(null);
      const appendSpy = vi.spyOn(document.body, "appendChild");

      await copyToClipboard("hello");

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
    });

    it("appends to document.body when active element is in the main document (not in a shadow root)", async () => {
      // Regression case: getRootNode() returns Document, not ShadowRoot.
      // The old one-liner passed Document to root.appendChild(), throwing HierarchyRequestError.
      const el = document.createElement("input");
      document.body.appendChild(el);
      vi.mocked(deepActiveElement).mockReturnValue(el);
      const appendSpy = vi.spyOn(document.body, "appendChild");

      await copyToClipboard("hello");

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
      document.body.removeChild(el);
    });

    it("appends to the shadow host when active element is inside a shadow root", async () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      const inner = document.createElement("input");
      shadow.appendChild(inner);

      vi.mocked(deepActiveElement).mockReturnValue(inner);
      const appendSpy = vi.spyOn(host, "appendChild");

      await copyToClipboard("hello");

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
      document.body.removeChild(host);
    });

    it("appends to the topmost shadow host for nested shadow roots", async () => {
      const outerHost = document.createElement("div");
      document.body.appendChild(outerHost);
      const outerShadow = outerHost.attachShadow({ mode: "open" });
      const innerHost = document.createElement("div");
      outerShadow.appendChild(innerHost);
      const innerShadow = innerHost.attachShadow({ mode: "open" });
      const deepEl = document.createElement("input");
      innerShadow.appendChild(deepEl);

      vi.mocked(deepActiveElement).mockReturnValue(deepEl);
      const appendSpy = vi.spyOn(outerHost, "appendChild");

      await copyToClipboard("hello");

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
      document.body.removeChild(outerHost);
    });

    it("uses provided rootEl and ignores the detected root", async () => {
      vi.mocked(deepActiveElement).mockReturnValue(null);
      const customRoot = document.createElement("div");
      document.body.appendChild(customRoot);
      const appendSpy = vi.spyOn(customRoot, "appendChild");

      await copyToClipboard("hello", customRoot);

      expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
      document.body.removeChild(customRoot);
    });

    it("copies the correct string value via execCommand", async () => {
      vi.mocked(deepActiveElement).mockReturnValue(null);

      await copyToClipboard("copy this text");

      expect(execCommandMock).toHaveBeenCalledWith("copy");
    });
  });
});
