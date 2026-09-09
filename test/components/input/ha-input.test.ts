import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../../src/components/input/ha-input";
import type { HaInput } from "../../../src/components/input/ha-input";

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by wa-input.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  internalsProto.checkValidity = () => true;
  internalsProto.reportValidity = () => true;
  internalsProto.states = new Set();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

let inputs: HaInput[] = [];

const mountInput = async (props: Partial<HaInput> = {}): Promise<HaInput> => {
  const el = document.createElement("ha-input");
  Object.assign(el, props);
  document.body.append(el);
  inputs.push(el);
  await el.updateComplete;
  const waInput = el.shadowRoot!.querySelector("wa-input");
  await waInput?.updateComplete;
  return el;
};

const nativeInput = (el: HaInput): HTMLInputElement => {
  const waInput = el.shadowRoot!.querySelector("wa-input")!;
  return waInput.shadowRoot!.querySelector('[part~="input"]')!;
};

const nativeLabel = (el: HaInput): HTMLLabelElement => {
  const waInput = el.shadowRoot!.querySelector("wa-input")!;
  return waInput.shadowRoot!.querySelector("label")!;
};

afterEach(() => {
  inputs.forEach((el) => el.remove());
  inputs = [];
});

describe("ha-input password-manager autofill", () => {
  // Password managers often write the nested native input without firing
  // input/change, so login used to submit empty credentials (#51620).
  it("picks up a silent native fill on reportValidity", async () => {
    const el = await mountInput({ label: "Username", required: true });
    const received: string[] = [];
    el.addEventListener("input", () => {
      received.push(el.value ?? "");
    });

    nativeInput(el).value = "admin";

    expect(el.value).toBeUndefined();
    expect(el.reportValidity()).toBe(true);
    expect(el.value).toBe("admin");
    expect(received).toEqual(["admin"]);
  });

  it("does not emit when the native value already matches", async () => {
    const el = await mountInput({ label: "Username", value: "admin" });
    const listener = vi.fn();
    el.addEventListener("input", listener);

    expect(el.syncFromNativeInput()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("ha-input native ids", () => {
  // Native id remapping itself lives in @home-assistant/webawesome (inputId).
  // Until that lands, assert that ha-input forwards the value onto wa-input.
  it("forwards input-id onto the inner wa-input", async () => {
    const el = await mountInput({
      label: "Username",
      inputId: "username",
    });

    const waInput = el.shadowRoot!.querySelector("wa-input") as HTMLElement & {
      inputId?: string;
    };
    expect(waInput.inputId).toBe("username");
    expect(waInput.getAttribute("input-id")).toBe("username");
  });

  it("keeps the default native id when input-id is omitted", async () => {
    const el = await mountInput({ label: "Username" });

    expect(nativeInput(el).id).toBe("input");
    expect(nativeLabel(el).htmlFor).toBe("input");
  });
});
