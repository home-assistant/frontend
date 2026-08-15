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
  it("renders its message and bottom offset", async () => {
    const element = await mountToast({
      labelText: "Configuration saved",
      bottomOffset: 24,
    });

    expect(element.shadowRoot?.querySelector(".message")?.textContent).toBe(
      "Configuration saved"
    );
    expect(
      (
        element.shadowRoot?.querySelector(".toast") as HTMLElement
      ).style.getPropertyValue("--ha-toast-bottom-offset")
    ).toBe("24px");
  });

  it("renders assigned action and dismiss content", async () => {
    toast = document.createElement("ha-toast");
    const action = document.createElement("button");
    action.slot = "action";
    const dismiss = document.createElement("button");
    dismiss.slot = "dismiss";
    toast.append(action, dismiss);
    document.body.append(toast);
    await toast.updateComplete;
    toast.requestUpdate();
    await toast.updateComplete;

    expect(
      toast.shadowRoot
        ?.querySelector<HTMLSlotElement>('slot[name="action"]')
        ?.assignedElements()
    ).toEqual([action]);
    expect(
      toast.shadowRoot
        ?.querySelector<HTMLSlotElement>('slot[name="dismiss"]')
        ?.assignedElements()
    ).toEqual([dismiss]);
    expect(
      toast.shadowRoot
        ?.querySelector(".actions")
        ?.classList.contains("has-action")
    ).toBe(true);
  });

  it("keeps changing visual text separate from live-region text", async () => {
    const element = await mountToast({
      labelText: "Updating in 59 seconds",
      announceText: "Updating in 60 seconds",
    });

    const visibleMessage = element.shadowRoot!.querySelector(".message")!;
    const liveRegion = element.shadowRoot!.querySelector(".assistive-message")!;
    expect(visibleMessage.textContent).toBe("Updating in 59 seconds");
    expect(visibleMessage.closest('[role="status"]')).toBeNull();
    expect(liveRegion.textContent?.trim()).toBe("Updating in 60 seconds");
    expect(liveRegion.getAttribute("role")).toBe("status");
    expect(liveRegion.getAttribute("aria-atomic")).toBe("true");
  });

  it("falls back to announcing the visible message", async () => {
    const element = await mountToast({ labelText: "Configuration saved" });

    expect(
      element
        .shadowRoot!.querySelector(".assistive-message")!
        .textContent?.trim()
    ).toBe("Configuration saved");
  });

  it("activates its live region while shown", async () => {
    const element = await mountToast();
    const liveRegion = element.shadowRoot!.querySelector(".assistive-message")!;
    expect(liveRegion.getAttribute("aria-live")).toBe("off");

    await showToast(element);

    expect(liveRegion.getAttribute("aria-live")).toBe("polite");
    expect(
      element.shadowRoot!.querySelector(".toast")!.classList.contains("visible")
    ).toBe(true);
  });

  it("shows as part of a stack without becoming a popover", async () => {
    const element = await mountToast({ stacked: true });

    await showToast(element);

    expect(
      element.shadowRoot!.querySelector(".toast")!.hasAttribute("popover")
    ).toBe(false);
    expect(
      element.shadowRoot!.querySelector(".toast")!.classList.contains("visible")
    ).toBe(true);
  });

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
