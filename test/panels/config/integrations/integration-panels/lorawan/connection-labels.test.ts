import { describe, expect, it } from "vitest";
import type { LoRaWANConnection } from "../../../../../../src/data/lorawan";
import { connectionLabels } from "../../../../../../src/panels/config/integrations/integration-panels/lorawan/connection-labels";

const connection = (entry_id: string, title: string): LoRaWANConnection => ({
  entry_id,
  title,
  domain: "chirpstack",
  configuration_url: null,
});

describe("connectionLabels", () => {
  it("preserves distinct connection names", () => {
    expect(
      connectionLabels([connection("a", "Home"), connection("b", "Garden")])
    ).toEqual(
      new Map([
        ["a", "Home"],
        ["b", "Garden"],
      ])
    );
  });

  it("keeps same-named connections separate regardless of snapshot order", () => {
    const connections = [
      connection("b", "ChirpStack"),
      connection("a", "ChirpStack"),
    ];
    const labels = connectionLabels(connections);
    expect(labels).toEqual(
      new Map([
        ["a", "ChirpStack (1)"],
        ["b", "ChirpStack (2)"],
      ])
    );
    expect(connectionLabels([...connections].reverse())).toEqual(labels);
  });

  it("avoids collisions with existing numbered names", () => {
    const labels = connectionLabels([
      connection("a", "ChirpStack"),
      connection("b", "ChirpStack"),
      connection("c", "ChirpStack (1)"),
    ]);
    expect(labels).toEqual(
      new Map([
        ["a", "ChirpStack (2)"],
        ["b", "ChirpStack (3)"],
        ["c", "ChirpStack (1)"],
      ])
    );
  });
});
