import { afterEach, describe, expect, it } from "vitest";
import type { HaListItemButton } from "../../src/components/item/ha-list-item-button";
import type { AssistSatelliteConfiguration } from "../../src/data/assist_satellite";
import "../../src/dialogs/voice-assistant-setup/voice-assistant-setup-step-change-wake-word";
import type { HaVoiceAssistantSetupStepChangeWakeWord } from "../../src/dialogs/voice-assistant-setup/voice-assistant-setup-step-change-wake-word";
import type { HomeAssistant } from "../../src/types";

const WAKE_WORDS = ["Okay Nabu", "Hey Jarvis", "Hey Mycroft"];

let step: HaVoiceAssistantSetupStepChangeWakeWord | undefined;

afterEach(() => {
  step?.remove();
  step = undefined;
});

describe("ha-voice-assistant-setup-step-change-wake-word", () => {
  it("shows the phrase of every available wake word", async () => {
    step = document.createElement(
      "ha-voice-assistant-setup-step-change-wake-word"
    );
    step.hass = { localize: (key: string) => key } as HomeAssistant;
    step.assistConfiguration = {
      available_wake_words: WAKE_WORDS.map((wakeWord, index) => ({
        id: `wake_word_${index}`,
        wake_word: wakeWord,
        trained_languages: ["en"],
      })),
      active_wake_words: ["wake_word_0"],
      max_active_wake_words: 1,
    } as AssistSatelliteConfiguration;
    document.body.append(step);
    await step.updateComplete;

    const items = [
      ...step.shadowRoot!.querySelectorAll<HaListItemButton>(
        "ha-list-item-button"
      ),
    ];
    await Promise.all(items.map((item) => item.updateComplete));

    expect(
      items.map((item) =>
        item
          .shadowRoot!.querySelector<HTMLSlotElement>('slot[name="headline"]')
          ?.assignedNodes({ flatten: true })
          .map((node) => node.textContent)
          .join("")
      )
    ).toEqual(WAKE_WORDS);
  });
});
