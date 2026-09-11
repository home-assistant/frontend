import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaToast } from "../../src/components/ha-toast";
import "../../src/components/ha-toast";

let toast: HaToast | undefined;

const mountToast = async (properties: Partial<HaToast> = {}) => {
  toast = document.createElement("ha-toast");
  Object.assign(toast, properties);
  document.body.append(toast);
  await toast.updateComplete;
  return toast;
};

afterEach(() => {
  toast?.remove();
  toast = undefined;
  vi.useRealTimers();
});

const showToast = async (element: HaToast) => {
  vi.useFakeTimers();
  const shown = element.show();
  await element.updateComplete;
  Object.defineProperty(
    element.shadowRoot!.querySelector(".toast"),
    "getAnimations",
    {
      configurable: true,
      value: () => [],
    }
  );
  await vi.advanceTimersByTimeAsync(20);
  await shown;
};

describe("ha-toast", () => {
  it.each(["action", "dismiss", "programmatic"] as const)(
    "reports a %s close reason",
    async (reason) => {
      const element = await mountToast({ timeoutMs: -1 });
      const listener = vi.fn();
      element.addEventListener("toast-closed", listener);
      await showToast(element);

      await element.hide(reason);

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toEqual({ reason });
      expect(
        element
          .shadowRoot!.querySelector(".toast")!
          .classList.contains("active")
      ).toBe(false);
      expect(
        element
          .shadowRoot!.querySelector(".assistive-message")!
          .getAttribute("aria-live")
      ).toBe("off");
    }
  );

  it("closes with a timeout reason", async () => {
    const element = await mountToast({ timeoutMs: 1000 });
    const listener = vi.fn();
    element.addEventListener("toast-closed", listener);
    await showToast(element);

    await vi.advanceTimersByTimeAsync(1000);

    expect(listener.mock.calls[0][0].detail).toEqual({ reason: "timeout" });
  });

  it("does not close automatically when the timeout is disabled", async () => {
    const element = await mountToast({ timeoutMs: -1 });
    const listener = vi.fn();
    element.addEventListener("toast-closed", listener);
    await showToast(element);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not emit a close event when already hidden", async () => {
    const element = await mountToast();
    const listener = vi.fn();
    element.addEventListener("toast-closed", listener);

    await element.hide("dismiss");

    expect(listener).not.toHaveBeenCalled();
  });
});
