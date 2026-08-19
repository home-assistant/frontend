import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FormDialogData,
  FormDialogParams,
} from "../../../src/dialogs/form/show-form-dialog";
import type { DialogForm } from "../../../src/dialogs/form/dialog-form";
import "../../../src/dialogs/form/dialog-form";

vi.mock("../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-dialog", () => {
  customElements.define(
    "ha-dialog",
    class extends HTMLElement {
      public bodyContainer = document.createElement("div");
    }
  );
  return {};
});

vi.mock("../../../src/components/ha-dialog-footer", () => {
  customElements.define("ha-dialog-footer", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-form/ha-form", () => {
  customElements.define(
    "ha-form",
    class extends HTMLElement {
      public reportValidity = vi.fn(() => true);
    }
  );
  return {};
});

const getInternals = (dialog: DialogForm) =>
  dialog as unknown as Record<string, unknown>;

const getForms = (dialog: DialogForm): HTMLElement[] =>
  Array.from(dialog.shadowRoot!.querySelectorAll("ha-form"));

const outerParams = (data: FormDialogData = {}): FormDialogParams => ({
  title: "Outer",
  schema: [{ name: "value", selector: { text: {} } }],
  data,
  submit: vi.fn(),
  cancel: vi.fn(),
});

const nestedParams = (data: FormDialogData = {}): FormDialogParams => ({
  title: "Nested",
  schema: [{ name: "value", selector: { text: {} } }],
  data,
  submit: vi.fn(),
  cancel: vi.fn(),
});

const hass = {
  localize: (key: string) => key,
} as never;

const openDialog = async (params = outerParams()) => {
  const dialog = document.createElement("dialog-form") as DialogForm;
  dialog.hass = hass;
  document.body.append(dialog);
  await dialog.showDialog(params);
  await dialog.updateComplete;
  return dialog;
};

const showNestedDialog = async (
  dialog: DialogForm,
  form: Element,
  params: FormDialogParams,
  dialogTag = "dialog-form",
  origin: Element = form
) => {
  origin.dispatchEvent(
    new CustomEvent("show-dialog", {
      bubbles: true,
      composed: true,
      detail: { dialogTag, dialogParams: params },
    })
  );
  await dialog.updateComplete;
};

const submit = (dialog: DialogForm) =>
  (getInternals(dialog)["_submit"] as () => void)();

const cancel = (dialog: DialogForm) =>
  (getInternals(dialog)["_cancel"] as () => void)();

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("dialog-form mounted nested forms", () => {
  it("keeps parent forms mounted while nested", async () => {
    const dialog = await openDialog();
    const parent = getForms(dialog)[0];

    await showNestedDialog(dialog, parent, nestedParams());

    const forms = getForms(dialog);
    expect(forms).toHaveLength(2);
    expect(forms[0].hidden).toBe(true);
    expect(forms[1].hidden).toBe(false);
    expect(forms[0].hasAttribute("autofocus")).toBe(false);
    expect(forms[1].hasAttribute("autofocus")).toBe(true);
  });

  it("returns to the parent after nested submit", async () => {
    const dialog = await openDialog();
    const nested = nestedParams({ value: "nested" });
    const parent = getForms(dialog)[0];

    await showNestedDialog(dialog, parent, nested);
    submit(dialog);
    await dialog.updateComplete;

    expect(nested.submit).toHaveBeenCalledWith({ value: "nested" });
    expect(getInternals(dialog)["_open"]).toBe(true);
    expect(getInternals(dialog)["_stack"]).toHaveLength(0);
    expect(getForms(dialog)[0].hidden).toBe(false);
  });

  it("keeps the parent open after a custom object selector nested save", async () => {
    const dialog = await openDialog();
    const nested = {
      ...nestedParams({ items: [] }),
      schema: [
        {
          name: "items",
          selector: {
            object: {
              multiple: true,
              fields: { name: { selector: { text: {} } } },
            },
          },
        },
      ],
    } satisfies FormDialogParams;

    const descendant = document.createElement("div");
    getForms(dialog)[0].append(descendant);
    await showNestedDialog(
      dialog,
      getForms(dialog)[0],
      nested,
      "dialog-form",
      descendant
    );
    submit(dialog);
    await dialog.updateComplete;

    expect(nested.submit).toHaveBeenCalledWith({ items: [] });
    expect(getInternals(dialog)["_open"]).toBe(true);
    expect(getInternals(dialog)["_stack"]).toHaveLength(0);
    expect(getForms(dialog)[0].hidden).toBe(false);
  });

  it("returns to the parent after nested cancel", async () => {
    const parentData = { value: "parent" };
    const dialog = await openDialog(outerParams(parentData));
    const nested = nestedParams({ value: "nested" });

    await showNestedDialog(dialog, getForms(dialog)[0], nested);
    cancel(dialog);
    await dialog.updateComplete;

    expect(nested.cancel).toHaveBeenCalledOnce();
    expect(getInternals(dialog)["_open"]).toBe(true);
    expect((getInternals(dialog)["_data"] as FormDialogData).value).toBe(
      "parent"
    );
    expect(getForms(dialog)[0].hidden).toBe(false);
  });

  it("routes hidden parent value changes to its stack entry", async () => {
    const dialog = await openDialog(outerParams({ value: "original" }));
    const parent = getForms(dialog)[0];

    await showNestedDialog(dialog, parent, nestedParams());
    parent.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { value: "updated" } },
      })
    );

    expect(
      (getInternals(dialog)["_stack"] as Record<string, unknown>[])[0].data
    ).toEqual({ value: "updated" });

    cancel(dialog);
    expect((getInternals(dialog)["_data"] as FormDialogData).value).toBe(
      "updated"
    );
  });

  it("keeps multiple nested levels mounted and pops them in order", async () => {
    const dialog = await openDialog();
    await showNestedDialog(dialog, getForms(dialog)[0], nestedParams());
    await showNestedDialog(dialog, getForms(dialog)[1], nestedParams());

    expect(getForms(dialog)).toHaveLength(3);
    expect(getForms(dialog).map((form) => form.hidden)).toEqual([
      true,
      true,
      false,
    ]);

    cancel(dialog);
    await dialog.updateComplete;
    expect(getForms(dialog).map((form) => form.hidden)).toEqual([true, false]);

    cancel(dialog);
    await dialog.updateComplete;
    expect(getForms(dialog).map((form) => form.hidden)).toEqual([false]);
  });

  it("accepts active show-dialog events only", async () => {
    const dialog = await openDialog();
    const parent = getForms(dialog)[0];
    const nested = nestedParams();

    await showNestedDialog(dialog, parent, nested);
    const child = getForms(dialog)[1];
    await showNestedDialog(dialog, parent, nestedParams());
    expect(getInternals(dialog)["_stack"]).toHaveLength(1);

    await showNestedDialog(dialog, child, nestedParams(), "not-dialog-form");
    expect(getInternals(dialog)["_stack"]).toHaveLength(1);
  });

  it("tracks dirty state across nested levels", async () => {
    const dialog = await openDialog();
    expect(dialog.isDirtyState).toBe(false);

    getForms(dialog)[0].dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { value: "changed" } },
      })
    );
    expect(dialog.isDirtyState).toBe(true);

    await showNestedDialog(dialog, getForms(dialog)[0], nestedParams());
    cancel(dialog);
    expect(dialog.isDirtyState).toBe(true);

    const cleanDialog = await openDialog();
    getForms(cleanDialog)[0].dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { value: "changed" } },
      })
    );
    expect(cleanDialog.isDirtyState).toBe(true);

    cancel(cleanDialog);
    (getInternals(cleanDialog)["_dialogClosed"] as () => void)();
    expect(cleanDialog.isDirtyState).toBe(false);

    const cleanNestedDialog = await openDialog();
    await showNestedDialog(
      cleanNestedDialog,
      getForms(cleanNestedDialog)[0],
      nestedParams()
    );
    cancel(cleanNestedDialog);
    expect(cleanNestedDialog.isDirtyState).toBe(false);

    submit(cleanNestedDialog);
    expect(cleanNestedDialog.isDirtyState).toBe(false);

    submit(dialog);
    expect(dialog.isDirtyState).toBe(false);
  });

  it("validates the active form before submitting", async () => {
    const dialog = await openDialog();
    const parent = getForms(dialog)[0];
    const nested = nestedParams();
    await showNestedDialog(dialog, parent, nested);

    const child = getForms(dialog)[1];
    const parentReportValidity = vi.fn(() => true);
    const childReportValidity = vi.fn(() => false);
    Object.defineProperty(parent, "reportValidity", {
      value: parentReportValidity,
    });
    Object.defineProperty(child, "reportValidity", {
      value: childReportValidity,
    });

    submit(dialog);

    expect(parentReportValidity).not.toHaveBeenCalled();
    expect(childReportValidity).toHaveBeenCalledOnce();
    expect(nested.submit).not.toHaveBeenCalled();
    expect(getInternals(dialog)["_open"]).toBe(true);
  });
});
