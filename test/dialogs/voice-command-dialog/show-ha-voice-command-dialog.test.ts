import { beforeEach, describe, expect, it, vi } from "vitest";
import { showVoiceCommandDialog } from "../../../src/dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { HomeAssistant } from "../../../src/types";

describe("showVoiceCommandDialog", () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement("div");
  });

  it("passes an initial prompt to the web dialog", () => {
    const hass = {
      auth: { external: undefined },
    } as HomeAssistant;
    const listener = vi.fn();
    element.addEventListener("show-dialog", listener);

    showVoiceCommandDialog(element, hass, {
      pipeline_id: "last_used",
      prompt: "Turn on the lights",
      submit: true,
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.dialogParams).toEqual({
      pipeline_id: "last_used",
      start_listening: false,
      prompt: "Turn on the lights",
      submit: true,
    });
  });

  it("keeps the native Assist payload compatible", () => {
    const fireMessage = vi.fn();
    const hass = {
      auth: {
        external: {
          config: { hasAssist: true },
          fireMessage,
        },
      },
    } as unknown as HomeAssistant;

    showVoiceCommandDialog(element, hass, {
      pipeline_id: "last_used",
      start_listening: false,
      prompt: "Turn on the lights",
      submit: true,
    });

    expect(fireMessage).toHaveBeenCalledWith({
      type: "assist/show",
      payload: {
        pipeline_id: "last_used",
        start_listening: false,
      },
    });
  });
});
