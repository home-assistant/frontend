import { describe, it, assert, expect, vi } from "vitest";
import { HistoryStream, computeHistory } from "../../src/data/history";
import type { HomeAssistant } from "../../src/types";
import { mockDevice, mockEntity } from "../common/entity/context/context-mock";
import {
  createMockEntityState,
  createMockHass,
  mockLocalize,
} from "../fixtures/hass";

const mockHass = {} as HomeAssistant;

describe("HistoryStream.processMessage", () => {
  it("should delete lc from boundary state when pruning expired history", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // Seed combinedHistory with states where lc differs from lu
    // (simulating a sensor reporting the same value multiple times)
    const oldLc = purgeBeforePythonTime - 3600; // lc is 1 hour before purge time
    const oldLu = purgeBeforePythonTime - 10; // lu is 10 seconds before purge time
    stream.combinedHistory = {
      "sensor.power": [
        { s: "500", a: {}, lc: oldLc, lu: oldLu },
        { s: "500", a: {}, lu: purgeBeforePythonTime + 100 },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "510", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    const boundaryState = result["sensor.power"][0];
    // lc should be deleted so chart uses lu instead of stale lc
    assert.equal(boundaryState.lc, undefined);
    // lu should be set to approximately purgeBeforePythonTime
    assert.closeTo(boundaryState.lu, purgeBeforePythonTime, 1);
    // value should be preserved from the expired state
    assert.equal(boundaryState.s, "500");
  });

  it("should handle boundary state without lc correctly", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // State without lc (lc equals lu, so lc is omitted)
    stream.combinedHistory = {
      "sensor.power": [
        { s: "500", a: {}, lu: purgeBeforePythonTime - 10 },
        { s: "510", a: {}, lu: purgeBeforePythonTime + 100 },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "520", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    const boundaryState = result["sensor.power"][0];
    assert.equal(boundaryState.lc, undefined);
    assert.closeTo(boundaryState.lu, purgeBeforePythonTime, 1);
    assert.equal(boundaryState.s, "500");
  });

  it("should not modify states when none are expired", () => {
    const now = Date.now();
    const hoursToShow = 1;
    const stream = new HistoryStream(mockHass, hoursToShow);
    const purgeBeforePythonTime = (now - 60 * 60 * hoursToShow * 1000) / 1000;

    // All states are within the time window
    stream.combinedHistory = {
      "sensor.power": [
        {
          s: "500",
          a: {},
          lc: purgeBeforePythonTime + 50,
          lu: purgeBeforePythonTime + 100,
        },
      ],
    };

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = stream.processMessage({
      states: {
        "sensor.power": [{ s: "510", a: {}, lu: purgeBeforePythonTime + 200 }],
      },
    });

    vi.useRealTimers();

    // First state should retain its original lc since it wasn't expired
    const firstState = result["sensor.power"][0];
    assert.equal(firstState.lc, purgeBeforePythonTime + 50);
    assert.equal(firstState.lu, purgeBeforePythonTime + 100);
  });
});

const namedHistoryHass = (options: {
  entityId: string;
  entityName?: string;
  deviceName: string;
  attributes?: Record<string, unknown>;
  rtl?: boolean;
}): HomeAssistant => {
  const hass = createMockHass(
    {
      [options.entityId]: createMockEntityState(
        options.entityId,
        "on",
        options.attributes ?? { friendly_name: "Caméra Allée Battery state" }
      ),
    },
    {
      entities: {
        [options.entityId]: mockEntity({
          entity_id: options.entityId,
          name: options.entityName,
          device_id: "device_1",
        }),
      },
      devices: {
        device_1: mockDevice({
          id: "device_1",
          name: options.deviceName,
        }),
      },
    }
  );
  if (options.rtl) {
    hass.language = "he";
    hass.translationMetadata = {
      fragments: [],
      translations: {
        he: { nativeName: "Hebrew", isRTL: true, hash: "" },
      },
    };
  }
  return hass;
};

const binaryHistory = (entityId: string, friendlyName?: string) => ({
  [entityId]: [
    {
      s: "on",
      a: friendlyName ? { friendly_name: friendlyName } : {},
      lu: 1_700_000_000,
    },
  ],
});

const numericHistory = (entityId: string, friendlyName?: string) => ({
  [entityId]: [
    {
      s: "12",
      a: {
        unit_of_measurement: "W",
        ...(friendlyName ? { friendly_name: friendlyName } : {}),
      },
      lu: 1_700_000_000,
    },
  ],
});

describe("computeHistory entity names", () => {
  it("labels a timeline entity as Device ▸ Entity when the entity has its own name", () => {
    const entityId = "binary_sensor.allee_battery";
    const result = computeHistory(
      namedHistoryHass({
        entityId,
        entityName: "Battery state",
        deviceName: "Caméra Allée",
      }),
      binaryHistory(entityId),
      [],
      mockLocalize
    );
    expect(result.timeline[0]?.name).toBe("Caméra Allée ▸ Battery state");
  });

  it("labels a line entity as Device ▸ Entity when the entity has its own name", () => {
    const entityId = "sensor.allee_power";
    const result = computeHistory(
      namedHistoryHass({
        entityId,
        entityName: "Power",
        deviceName: "Caméra Allée",
        attributes: {
          unit_of_measurement: "W",
          friendly_name: "Caméra Allée Power",
        },
      }),
      numericHistory(entityId),
      [],
      mockLocalize
    );
    expect(result.line[0]?.data[0]?.name).toBe("Caméra Allée ▸ Power");
  });

  it("uses just the device name when the entity has no name of its own", () => {
    const entityId = "binary_sensor.desk";
    const result = computeHistory(
      namedHistoryHass({
        entityId,
        deviceName: "Desk",
        attributes: { friendly_name: "Desk" },
      }),
      binaryHistory(entityId),
      [],
      mockLocalize
    );
    expect(result.timeline[0]?.name).toBe("Desk");
  });

  it("falls back to friendly_name when the entity has no current state", () => {
    const entityId = "binary_sensor.removed";
    const result = computeHistory(
      createMockHass(),
      binaryHistory(entityId, "Gone sensor"),
      [],
      mockLocalize
    );
    expect(result.timeline[0]?.name).toBe("Gone sensor");
  });

  it("uses the RTL separator when the language is RTL", () => {
    const entityId = "binary_sensor.allee_battery";
    const result = computeHistory(
      namedHistoryHass({
        entityId,
        entityName: "Battery state",
        deviceName: "Caméra Allée",
        rtl: true,
      }),
      binaryHistory(entityId),
      [],
      mockLocalize
    );
    expect(result.timeline[0]?.name).toBe("Caméra Allée ◂ Battery state");
  });
});
