import { describe, expect, it } from "vitest";
import {
  createVoiceAssistantQueryString,
  decodeVoiceAssistantQueryParams,
} from "../../../src/common/url/voice-assistant-query-params";

describe("voice assistant query params", () => {
  it("preserves omitted and explicitly empty assistant targets on roundtrip", () => {
    for (const params of [{}, { assistants: [] }]) {
      expect(
        decodeVoiceAssistantQueryParams(
          Object.fromEntries(
            new URLSearchParams(createVoiceAssistantQueryString(params))
          )
        )
      ).toEqual(params);
    }
  });

  it("roundtrips an escaped comma-separated assistant list", () => {
    const params = { assistants: ["conversation", "cloud.google_assistant"] };
    const query = createVoiceAssistantQueryString(params);

    expect(query).toBe("assistants=conversation%2Ccloud.google_assistant");
    expect(
      decodeVoiceAssistantQueryParams(
        Object.fromEntries(new URLSearchParams(query))
      )
    ).toEqual(params);
  });
});
