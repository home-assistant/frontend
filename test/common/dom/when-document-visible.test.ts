import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenDocumentVisible } from "../../../src/common/dom/when-document-visible";

describe("whenDocumentVisible", () => {
  let hidden: boolean;
  let cancel: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    hidden = true;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  });

  afterEach(() => {
    cancel?.();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("runs the callback after thaw without lifecycle events", async () => {
    const recover = vi.fn();
    cancel = whenDocumentVisible(recover);

    await vi.advanceTimersByTimeAsync(360000);
    expect(recover).not.toHaveBeenCalled();

    // The WebView changes visibility but emits no event when the screen wakes.
    hidden = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["visibilitychange", "resume", "focus"])(
    "recovers immediately on %s when visible",
    (type) => {
      const recover = vi.fn();
      cancel = whenDocumentVisible(recover);
      hidden = false;
      (type === "focus" ? window : document).dispatchEvent(new Event(type));
      expect(recover).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5000);
      expect(recover).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("keeps reconnects suspended when a lifecycle event arrives while hidden", () => {
    const recover = vi.fn();
    cancel = whenDocumentVisible(recover);
    document.dispatchEvent(new Event("resume"));
    window.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(1000);
    expect(recover).not.toHaveBeenCalled();
  });

  it("removes timers and listeners when cancelled", () => {
    const recover = vi.fn();
    cancel = whenDocumentVisible(recover);
    cancel();
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("resume"));
    window.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(1000);
    expect(recover).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
