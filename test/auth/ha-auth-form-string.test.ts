import { afterEach, describe, expect, it } from "vitest";
import "../../src/auth/ha-auth-form-string";
import type { HaAuthFormString } from "../../src/auth/ha-auth-form-string";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import type { HaFormStringSchema } from "../../src/components/ha-form/types";

const USERNAME_SCHEMA: HaFormStringSchema = {
  name: "username",
  type: "string",
  required: true,
  autocomplete: "username",
};

let forms: HTMLFormElement[] = [];

const mount = async (
  schema: HaFormStringSchema,
  data?: string
): Promise<HaAuthFormString> => {
  const form = document.createElement("form");
  const el = document.createElement("ha-auth-form-string");
  el.schema = schema;
  el.data = data as string;
  el.label = "Username";
  el.localize = ((key: string) => key) as unknown as LocalizeFunc;
  form.append(el);
  document.body.append(form);
  forms.push(form);
  await el.updateComplete;
  await el.querySelector("ha-auth-textfield")!.updateComplete;
  return el;
};

afterEach(() => {
  forms.forEach((form) => form.remove());
  forms = [];
});

describe("ha-auth-form-string", () => {
  // Password managers only find login fields whose native input is in the
  // light DOM (#51620), so this must not silently move into a shadow root.
  it("renders the native input in the light DOM", async () => {
    const el = await mount(USERNAME_SCHEMA);

    const input = document.querySelector<HTMLInputElement>(
      'input[name="username"]'
    );
    expect(input).not.toBeNull();
    expect(el.shadowRoot).toBeNull();
    expect(input!.getAttribute("autocomplete")).toBe("username");
    expect(input!.id).toBe("username");
    expect(el.querySelector("label")!.htmlFor).toBe("username");
    expect(el.closest("form")!.elements.namedItem("username")).toBe(input);
  });

  it("submits a value written to the native input without events", async () => {
    const el = await mount(USERNAME_SCHEMA);
    const received: string[] = [];
    el.addEventListener("value-changed", (ev) => {
      received.push((ev as CustomEvent).detail.value);
    });

    el.querySelector("input")!.value = "admin";

    expect(el.reportValidity()).toBe(true);
    expect(received).toEqual(["admin"]);
  });

  it("reports an empty required field and can focus it", async () => {
    const el = await mount(USERNAME_SCHEMA);

    expect(el.reportValidity()).toBe(false);

    el.focus();
    expect(document.activeElement).toBe(el.querySelector("input"));
  });
});
