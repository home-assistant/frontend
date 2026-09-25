import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaDialog } from "../../../src/components/ha-dialog";
import type {
  DataEntryFlowStep,
  DataEntryFlowStepForm,
  DataEntryFlowStepMenu,
} from "../../../src/data/data_entry_flow";
import "../../../src/dialogs/config-flow/dialog-data-entry-flow";
import type { FlowConfig } from "../../../src/dialogs/config-flow/show-dialog-data-entry-flow";
import type { HomeAssistant } from "../../../src/types";

vi.mock("../../../src/data/auth", () => ({
  autocompleteLoginFields: (schema: unknown) => schema,
}));

vi.mock("../../../src/components/ha-dialog", () => {
  customElements.define("ha-dialog", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-dialog-footer", () => {
  customElements.define("ha-dialog-footer", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-form/ha-form", () => {
  customElements.define("ha-form", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-list-item", () => {
  customElements.define("ha-list-item", class extends HTMLElement {});
  return {};
});

const formStep: DataEntryFlowStepForm = {
  type: "form",
  flow_id: "test-flow",
  handler: "test",
  step_id: "user",
  data_schema: [
    {
      name: "name",
      required: true,
      selector: { text: {} },
    },
  ],
  errors: {},
  last_step: true,
};

const menuStep: DataEntryFlowStepMenu = {
  type: "menu",
  flow_id: "test-flow",
  handler: "test",
  step_id: "user",
  menu_options: ["next"],
};

const flowConfig: FlowConfig = {
  flowType: "config_flow",
  showDevices: false,
  createFlow: vi.fn().mockResolvedValue(formStep),
  fetchFlow: vi.fn().mockResolvedValue(formStep),
  handleFlowStep: vi.fn().mockResolvedValue(formStep),
  deleteFlow: vi.fn().mockResolvedValue(undefined),
  renderAbortDescription: () => "",
  renderShowFormStepHeader: () => "Test flow",
  renderShowFormStepDescription: () => "",
  renderShowFormStepFieldLabel: () => "Name",
  renderShowFormStepFieldHelper: () => "",
  renderShowFormStepFieldError: () => "",
  renderShowFormStepFieldLocalizeValue: (_, __, key) => key,
  renderShowFormStepSubmitButton: () => "Submit",
  renderExternalStepHeader: () => "",
  renderExternalStepDescription: () => "",
  renderCreateEntryDescription: () => "",
  renderShowFormProgressHeader: () => "",
  renderShowFormProgressDescription: () => "",
  renderMenuHeader: () => "",
  renderMenuDescription: () => "",
  renderMenuOption: (_, __, option) => option,
  renderMenuOptionDescription: () => "",
  renderLoadingDescription: () => "",
};

const hass = {
  localize: (key: string) => key,
  devices: {},
} as HomeAssistant;

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const openDialog = async (initialStep: DataEntryFlowStep = formStep) => {
  vi.mocked(flowConfig.createFlow).mockResolvedValueOnce(initialStep);
  const dialog = document.createElement("dialog-data-entry-flow");
  dialog.hass = hass;
  document.body.append(dialog);
  await dialog.showDialog({
    startFlowHandler: "test",
    flowConfig,
  });
  await nextTask();
  await dialog.updateComplete;
  return dialog;
};

const innerDialog = (dialog: HTMLElementTagNameMap["dialog-data-entry-flow"]) =>
  dialog.shadowRoot!.querySelector("ha-dialog") as HaDialog;

describe("dialog-data-entry-flow dismissal", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("allows clean forms to be dismissed", async () => {
    const dialog = await openDialog();

    expect(innerDialog(dialog).preventScrimClose).toBe(false);
  });

  it("prevents dismissal after form values change", async () => {
    const dialog = await openDialog();
    const step = dialog.shadowRoot!.querySelector("step-flow-form")!;
    await step.updateComplete;
    const form = step.shadowRoot!.querySelector("ha-form")!;

    form.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { name: "New list" } },
      })
    );
    await nextTask();
    await dialog.updateComplete;

    expect(innerDialog(dialog).preventScrimClose).toBe(true);
  });

  it("prevents dismissal after advancing to a clean form step", async () => {
    const dialog = await openDialog();

    dialog.dispatchEvent(
      new CustomEvent("flow-update", {
        detail: {
          step: {
            ...formStep,
            step_id: "second",
          },
        },
      })
    );
    await nextTask();
    await dialog.updateComplete;

    const step = dialog.shadowRoot!.querySelector("step-flow-form")!;
    await step.updateComplete;

    expect(innerDialog(dialog).preventScrimClose).toBe(true);
  });

  it("prevents dismissal while advancing from a menu step", async () => {
    vi.mocked(flowConfig.handleFlowStep).mockReturnValueOnce(
      Promise.race<DataEntryFlowStep>([])
    );
    const dialog = await openDialog(menuStep);
    const step = dialog.shadowRoot!.querySelector("step-flow-menu")!;
    await step.updateComplete;

    step.shadowRoot!.querySelector<HTMLElement>("ha-list-item")!.click();
    await dialog.updateComplete;

    expect(innerDialog(dialog).preventScrimClose).toBe(true);
  });

  it("prevents dismissal while a form is submitting", async () => {
    const dialog = await openDialog();
    const step = dialog.shadowRoot!.querySelector("step-flow-form")!;

    step.dispatchEvent(
      new CustomEvent("flow-step-footer-state-changed", {
        detail: { loading: true },
      })
    );
    await dialog.updateComplete;

    expect(innerDialog(dialog).preventScrimClose).toBe(true);
  });
});
