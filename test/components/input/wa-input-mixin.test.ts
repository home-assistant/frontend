import { LitElement } from "lit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WaInput } from "../../../src/components/input/wa-input-mixin";
import { WaInputMixin } from "../../../src/components/input/wa-input-mixin";

const supportsNative = vi.hoisted(() => ({ value: true }));

vi.mock(
  "../../../src/common/feature-detect/support-native-element-internals",
  () => ({
    supportsNativeElementInternals: () => supportsNative.value,
  })
);

// Subclassing gives legitimate access to the mixin's protected members, which
// ha-input and ha-textarea reach through their @input/@blur/@wa-invalid bindings.
class TestInput extends WaInputMixin(LitElement) {
  public controlValid = true;

  protected get _formControl(): WaInput {
    return {
      value: "",
      select: () => undefined,
      setSelectionRange: () => undefined,
      setRangeText: () => undefined,
      checkValidity: () => this.controlValid,
      validationMessage: "Please fill out this field.",
    };
  }

  public get isInvalid(): boolean {
    return this._invalid;
  }

  public set isInvalid(value: boolean) {
    this._invalid = value;
  }

  public handleInput(): void {
    this._handleInput();
  }

  public handleBlur(): void {
    this._handleBlur();
  }

  public handleInvalid(): void {
    this._handleInvalid();
  }
}

customElements.define("test-wa-input-mixin", TestInput);

declare global {
  interface HTMLElementTagNameMap {
    "test-wa-input-mixin": TestInput;
  }
}

const createInput = (props: Partial<TestInput> = {}): TestInput => {
  const el = document.createElement("test-wa-input-mixin");
  Object.assign(el, props);
  return el;
};

describe("WaInputMixin validity", () => {
  beforeEach(() => {
    supportsNative.value = true;
  });

  describe("with native element internals", () => {
    it("marks invalid on blur when auto-validate is set", () => {
      const el = createInput({ autoValidate: true, controlValid: false });
      el.handleBlur();
      expect(el.isInvalid).toBe(true);
    });

    it("keeps valid on blur when the control is valid", () => {
      const el = createInput({ autoValidate: true, controlValid: true });
      el.handleBlur();
      expect(el.isInvalid).toBe(false);
    });

    it("ignores blur without auto-validate", () => {
      const el = createInput({ autoValidate: false, controlValid: false });
      el.handleBlur();
      expect(el.isInvalid).toBe(false);
    });

    it("clears invalid on input once the control is valid", () => {
      const el = createInput({ controlValid: true });
      el.isInvalid = true;
      el.handleInput();
      expect(el.isInvalid).toBe(false);
    });

    it("keeps invalid on input while the control is invalid", () => {
      const el = createInput({ controlValid: false });
      el.isInvalid = true;
      el.handleInput();
      expect(el.isInvalid).toBe(true);
    });

    it("marks invalid on the invalid event", () => {
      const el = createInput();
      el.handleInvalid();
      expect(el.isInvalid).toBe(true);
    });
  });

  // Polyfilled internals report validity the app cannot trust, so every path
  // must agree with checkValidity() and leave the field alone (#51338).
  describe("without native element internals", () => {
    beforeEach(() => {
      supportsNative.value = false;
    });

    it("does not mark invalid on blur", () => {
      const el = createInput({ autoValidate: true, controlValid: false });
      el.handleBlur();
      expect(el.isInvalid).toBe(false);
    });

    it("clears invalid on input", () => {
      const el = createInput({ controlValid: false });
      el.isInvalid = true;
      el.handleInput();
      expect(el.isInvalid).toBe(false);
    });

    it("ignores the invalid event", () => {
      const el = createInput();
      el.handleInvalid();
      expect(el.isInvalid).toBe(false);
    });

    it("reports valid so submission is never blocked", () => {
      const el = createInput({ required: true, controlValid: false });
      expect(el.checkValidity()).toBe(true);
      expect(el.reportValidity()).toBe(true);
      expect(el.isInvalid).toBe(false);
    });
  });
});
