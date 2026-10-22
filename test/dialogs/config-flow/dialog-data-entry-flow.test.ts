import { afterEach, describe, expect, it, vi } from "vitest";
import type { HaDialog } from "../../../src/components/ha-dialog";
import type {
  DataEntryFlowProgressedEvent,
  DataEntryFlowStep,
  DataEntryFlowStepExternal,
  DataEntryFlowStepForm,
  DataEntryFlowStepMenu,
  DataEntryFlowStepProgress,
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

vi.mock("../../../src/components/ha-button", async () => {
  const lit = await import("lit");

  class HaButton extends lit.LitElement {}

  customElements.define("ha-button", HaButton);

  return { HaButton };
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

const progressStep: DataEntryFlowStepProgress = {
  type: "progress",
  flow_id: "test-flow",
  handler: "test",
  step_id: "install",
  progress_action: "install",
};

const externalStep: DataEntryFlowStepExternal = {
  type: "external",
  flow_id: "test-flow",
  handler: "test",
  step_id: "auth",
  url: "https://example.com/authorize",
  description_placeholders: {},
};

const nextFormStep: DataEntryFlowStepForm = {
  ...formStep,
  step_id: "finish",
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

const eventListeners: Record<string, (ev: unknown) => void> = {};

const hass = {
  localize: (key: string) => key,
  devices: {},
  connection: {
    subscribeEvents: vi.fn(
      async (callback: (ev: unknown) => void, eventType: string) => {
        eventListeners[eventType] = callback;
        return () => undefined;
      }
    ),
  },
} as unknown as HomeAssistant;

const fireFlowProgressed = (flowId = "test-flow") => {
  const event: DataEntryFlowProgressedEvent = {
    type: "data_entry_flow_progressed",
    data: { handler: "test", flow_id: flowId, refresh: false },
  };
  eventListeners.data_entry_flow_progressed(event);
};

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

describe("dialog-data-entry-flow progress", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
    vi.mocked(flowConfig.fetchFlow).mockReset().mockResolvedValue(formStep);
  });

  const shownStep = (dialog: HTMLElementTagNameMap["dialog-data-entry-flow"]) =>
    dialog.shadowRoot!.querySelector<HTMLElement & { step: DataEntryFlowStep }>(
      "step-flow-form, step-flow-progress"
    )?.step;

  const deferFetchFlow = () => {
    let resolveFetch!: (step: DataEntryFlowStep) => void;
    vi.mocked(flowConfig.fetchFlow).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    return resolveFetch;
  };

  const settle = async (
    dialog: HTMLElementTagNameMap["dialog-data-entry-flow"]
  ) => {
    await nextTask();
    await dialog.updateComplete;
    await nextTask();
    await dialog.updateComplete;
  };

  it("shows the next step when the progress task finished before subscribing", async () => {
    vi.mocked(flowConfig.fetchFlow).mockResolvedValueOnce(nextFormStep);

    const dialog = await openDialog(progressStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledOnce();
    expect(shownStep(dialog)).toEqual(nextFormStep);
  });

  it("does not fetch an external step on subscribe", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    const dialog = await openDialog(externalStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledOnce();
    open.mockRestore();
  });

  it("shows the next task when a progress step keeps its step_id", async () => {
    const nextTaskStep: DataEntryFlowStepProgress = {
      ...progressStep,
      progress_action: "configure",
    };
    vi.mocked(flowConfig.fetchFlow).mockResolvedValueOnce(nextTaskStep);

    const dialog = await openDialog(progressStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledOnce();
    expect(shownStep(dialog)).toEqual(nextTaskStep);
  });

  it("retries the catch-up fetch when it fails after a progressed event", async () => {
    let rejectFetch!: (err: Error) => void;
    vi.mocked(flowConfig.fetchFlow)
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFetch = reject;
        })
      )
      .mockResolvedValueOnce(nextFormStep);

    const dialog = await openDialog(progressStep);
    fireFlowProgressed();
    rejectFetch(new Error("connection lost"));
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledTimes(2);
    expect(shownStep(dialog)).toEqual(nextFormStep);
  });

  it("keeps waiting when the catch-up fetch fails without a progressed event", async () => {
    vi.mocked(flowConfig.fetchFlow).mockRejectedValueOnce(
      new Error("connection lost")
    );

    const dialog = await openDialog(progressStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledOnce();
    expect(shownStep(dialog)).toEqual(progressStep);
  });

  it("follows a progressed event after catching up", async () => {
    vi.mocked(flowConfig.fetchFlow)
      .mockResolvedValueOnce(progressStep)
      .mockResolvedValueOnce(nextFormStep);

    const dialog = await openDialog(progressStep);
    await settle(dialog);
    fireFlowProgressed();
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledTimes(2);
    expect(shownStep(dialog)).toEqual(nextFormStep);
  });

  it("fetches the flow once when the progressed event arrives while catching up", async () => {
    const resolveFetch = deferFetchFlow();

    const dialog = await openDialog(progressStep);
    fireFlowProgressed();
    resolveFetch(nextFormStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledOnce();
    expect(shownStep(dialog)).toEqual(nextFormStep);
  });

  it("fetches again when the flow progressed after the catch-up fetch", async () => {
    const resolveFetch = deferFetchFlow();
    vi.mocked(flowConfig.fetchFlow).mockResolvedValueOnce(nextFormStep);

    const dialog = await openDialog(progressStep);
    fireFlowProgressed();
    resolveFetch(progressStep);
    await settle(dialog);

    expect(flowConfig.fetchFlow).toHaveBeenCalledTimes(2);
    expect(shownStep(dialog)).toEqual(nextFormStep);
  });

  it("ignores the catch-up fetch once the dialog has closed", async () => {
    const resolveFetch = deferFetchFlow();

    const dialog = await openDialog(progressStep);
    innerDialog(dialog).dispatchEvent(new CustomEvent("closed"));
    resolveFetch(nextFormStep);
    await settle(dialog);

    expect(dialog["_step"]).toBeUndefined();
  });
});
