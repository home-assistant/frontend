import { ContextProvider } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  internationalizationContext,
  statesContext,
} from "../../../../../../src/data/context";
import type {
  InfraredCapturedCode,
  InfraredCommand,
} from "../../../../../../src/data/infrared";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
} from "../../../../../../src/types";
import "../../../../../../src/panels/config/integrations/integration-panels/infrared/dialog-infrared-record-command";
import type { InfraredRecordCommandDialogParams } from "../../../../../../src/panels/config/integrations/integration-panels/infrared/show-dialog-infrared-record-command";

// The real components are Web Awesome based and do not upgrade in jsdom.
vi.mock("../../../../../../src/components/entity/ha-entity-picker", () => {
  customElements.define("ha-entity-picker", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/ha-alert", () => {
  customElements.define("ha-alert", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/ha-dialog", () => {
  customElements.define("ha-dialog", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/ha-dialog-footer", () => {
  customElements.define("ha-dialog-footer", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/ha-spinner", () => {
  customElements.define("ha-spinner", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../../../src/components/input/ha-input", () => {
  customElements.define("ha-input", class extends HTMLElement {});
  return {};
});

const RECEIVER = "infrared.blaster_receiver";
const SECOND_RECEIVER = "infrared.bedroom_receiver";
const EMITTER = "infrared.blaster_emitter";

const COMMANDS: InfraredCommand[] = [
  { id: "power", name: "Power", code: "0000 0001" },
];

const states = (entityIds: string[]) =>
  Object.fromEntries(
    entityIds.map((entityId) => [
      entityId,
      {
        entity_id: entityId,
        attributes: {
          device_class: entityId.endsWith("emitter") ? "emitter" : "receiver",
        },
      },
    ])
  ) as unknown as HomeAssistant["states"];

let subscriptions: {
  entityId: string;
  send: (captured: InfraredCapturedCode) => void;
  unsubscribe: UnsubscribeFunc;
}[] = [];

const createCommand = vi.fn(() => Promise.resolve());

const mountDialog = async (entityIds: string[]) => {
  const host = document.createElement("div");
  document.body.append(host);
  new ContextProvider(host, {
    context: statesContext,
    initialValue: states(entityIds),
  });
  new ContextProvider(host, {
    context: internationalizationContext,
    // The dialog only localizes, so a key-echoing localize is enough.
    initialValue: {
      localize: (key: string) => key,
    } as HomeAssistantInternationalization,
  });

  const dialog = document.createElement("dialog-infrared-record-command");
  const params: InfraredRecordCommandDialogParams = {
    commands: COMMANDS,
    subscribeReceiver: (entityId, callback) => {
      const unsubscribe = vi.fn();
      subscriptions.push({ entityId, send: callback, unsubscribe });
      return Promise.resolve(unsubscribe);
    },
    createCommand,
  };
  dialog.params = params;
  host.append(dialog);
  await dialog.updateComplete;
  return dialog;
};

const queryPart = <T extends HTMLElement>(
  dialog: HTMLElement,
  selector: string
) => dialog.shadowRoot!.querySelector<T>(selector);

const clickPrimary = async (
  dialog: HTMLElement & { updateComplete: Promise<unknown> }
) => {
  queryPart(dialog, 'ha-button[slot="primaryAction"]')!.click();
  await dialog.updateComplete;
};

afterEach(() => {
  subscriptions = [];
  createCommand.mockClear();
  document.body.innerHTML = "";
});

describe("dialog-infrared-record-command", () => {
  it("preselects the only receiver and listens to it", async () => {
    const dialog = await mountDialog([RECEIVER, EMITTER]);

    expect(
      queryPart<HTMLElement & { value?: string }>(dialog, "ha-entity-picker")!
        .value
    ).toBe(RECEIVER);

    await clickPrimary(dialog);
    await dialog.updateComplete;

    expect(subscriptions.map((s) => s.entityId)).toEqual([RECEIVER]);
    expect(dialog.shadowRoot!.textContent).toContain(
      "ui.panel.config.infrared.record.press_a_button"
    );
  });

  it("does not preselect a receiver when there are several", async () => {
    const dialog = await mountDialog([RECEIVER, SECOND_RECEIVER]);

    expect(
      queryPart<HTMLElement & { value?: string }>(dialog, "ha-entity-picker")!
        .value
    ).toBeUndefined();
  });

  it("names the recorded command and saves it", async () => {
    const dialog = await mountDialog([RECEIVER]);

    await clickPrimary(dialog);
    await dialog.updateComplete;
    subscriptions[0].send({ code: "0000 0002", duplicate_of: null });
    await dialog.updateComplete;

    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
    expect(
      queryPart<HTMLElement & { value: string }>(dialog, "ha-input")!.value
    ).toBe("ui.panel.config.infrared.record.suggested_name");

    await clickPrimary(dialog);

    expect(createCommand).toHaveBeenCalledWith({
      name: "ui.panel.config.infrared.record.suggested_name",
      code: "0000 0002",
    });
  });

  it("keeps listening when the command is already known", async () => {
    const dialog = await mountDialog([RECEIVER]);

    await clickPrimary(dialog);
    await dialog.updateComplete;
    // Pressing the same button reports a code of its own, which the backend
    // matches to the command already recorded.
    subscriptions[0].send({ code: "0000 0009", duplicate_of: "power" });
    await dialog.updateComplete;

    expect(dialog.shadowRoot!.textContent).toContain(
      "ui.panel.config.infrared.record.duplicate"
    );
    expect(dialog.shadowRoot!.textContent).toContain(
      "ui.panel.config.infrared.record.press_a_button"
    );
    expect(subscriptions[0].unsubscribe).not.toHaveBeenCalled();
    expect(queryPart(dialog, "ha-input")).toBeNull();
  });
});
