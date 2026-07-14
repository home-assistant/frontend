import { afterEach, describe, expect, it } from "vitest";
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
});

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
});
