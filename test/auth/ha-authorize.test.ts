import { describe, expect, it } from "vitest";

import { appNames } from "../../src/auth/app-names";

describe("ha-authorize", () => {
  it("labels the HarmonyOS companion app", () => {
    expect(appNames["https://home-assistant.io/harmonyos"]).toBe("HarmonyOS");
  });
});
