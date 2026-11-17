import { describe, expect, it } from "vitest";
import {
  mentionText,
  promptMentions,
  promptParts,
  promptText,
} from "../../../../../src/panels/config/automation/ai/automation-ai-mentions";

const light = { label: "Kitchen light", key: "entity_id", id: "light.kitchen" };
const area = { label: "Living room", key: "area_id", id: "living_room" };

// The prompt keeps targets as text, so the AI gets the right ids and the
// sheet shows them as chips. A label that breaks the format would lose them.
describe("prompt mentions", () => {
  const prompt = `Turn on ${mentionText(light)} in ${mentionText(area)} and ${mentionText(light)}`;

  it("finds each target once", () => {
    expect(promptMentions(prompt)).toEqual([light, area]);
  });

  it("reads mentions as @label", () => {
    expect(promptText(prompt)).toBe(
      "Turn on @Kitchen light in @Living room and @Kitchen light"
    );
  });

  it("splits the prompt into text and mentions", () => {
    expect(promptParts(prompt)).toEqual([
      "Turn on ",
      light,
      " in ",
      area,
      " and ",
      light,
    ]);
  });

  it("keeps a label with brackets readable", () => {
    const odd = { label: "Lamp [old]", key: "entity_id", id: "light.old" };
    expect(promptMentions(mentionText(odd))).toEqual([
      { ...odd, label: "Lamp old" },
    ]);
  });
});
