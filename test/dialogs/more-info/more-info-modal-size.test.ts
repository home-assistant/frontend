import { describe, expect, it } from "vitest";
import { computeMoreInfoModalSize } from "../../../src/dialogs/more-info/more-info-modal-size";

describe("computeMoreInfoModalSize", () => {
  it("asks for half a screen for a domain that only shows a state and its history", () => {
    expect(computeMoreInfoModalSize("sensor.kitchen_temperature")).toBe(
      "compact"
    );
    expect(computeMoreInfoModalSize("binary_sensor.front_door")).toBe(
      "compact"
    );
  });

  it("asks for the whole screen for a domain with a tall control", () => {
    expect(computeMoreInfoModalSize("light.kitchen")).toBe("full");
    expect(computeMoreInfoModalSize("climate.living_room")).toBe("full");
    expect(computeMoreInfoModalSize("camera.porch")).toBe("full");
  });

  it("gives an unknown domain the whole screen, since its details could be anything", () => {
    expect(computeMoreInfoModalSize("my_integration.thing")).toBe("full");
  });
});
