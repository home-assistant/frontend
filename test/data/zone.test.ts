import { describe, expect, it } from "vitest";
import { getEntityActiveZone } from "../../src/data/zone";
import { createMockEntityState } from "../fixtures/hass";

const zones = {
  "zone.work": createMockEntityState("zone.work", "0", {
    friendly_name: "Work",
    icon: "mdi:briefcase",
  }),
  "zone.other_work": createMockEntityState("zone.other_work", "0", {
    friendly_name: "Work",
    icon: "mdi:factory",
  }),
};

describe("getEntityActiveZone", () => {
  it.each(["person.anne", "device_tracker.phone"])(
    "selects the reported zone when names are identical for %s",
    (entityId) => {
      for (const zone of Object.values(zones)) {
        const entity = createMockEntityState(entityId, "Work", {
          in_zones: [zone.entity_id],
        });

        expect(getEntityActiveZone(entity, zones)).toBe(zone);
      }
    }
  );

  it("selects the first existing active zone in the reported order", () => {
    const entity = createMockEntityState("person.anne", "Work", {
      in_zones: [
        "zone.removed",
        "zone.passive",
        "zone.other_work",
        "zone.work",
      ],
    });

    expect(
      getEntityActiveZone(entity, {
        ...zones,
        "zone.passive": createMockEntityState("zone.passive", "0", {
          friendly_name: "Work",
          passive: true,
        }),
      })
    ).toBe(zones["zone.other_work"]);
  });

  it("does not require the zone name to match when an ID is reported", () => {
    const entity = createMockEntityState("person.anne", "Old workplace", {
      in_zones: ["zone.work"],
    });

    expect(getEntityActiveZone(entity, zones)).toBe(zones["zone.work"]);
  });

  it.each([{ inZones: ["zone.removed"] }, { inZones: ["zone.passive"] }])(
    "does not fall back to names for reported zones $inZones",
    ({ inZones }) => {
      const entity = createMockEntityState("person.anne", "Work", {
        in_zones: inZones,
      });

      expect(
        getEntityActiveZone(entity, {
          "zone.work": zones["zone.work"],
          "zone.passive": createMockEntityState("zone.passive", "0", {
            friendly_name: "Work",
            passive: true,
          }),
        })
      ).toBeUndefined();
    }
  );

  describe.each([{ attributes: {} }, { attributes: { in_zones: [] } }])(
    "legacy entities with $attributes",
    ({ attributes }) => {
      it("uses a unique active zone name", () => {
        const entity = createMockEntityState("person.anne", "Work", attributes);

        expect(
          getEntityActiveZone(entity, {
            "zone.passive": createMockEntityState("zone.passive", "0", {
              friendly_name: "Work",
              passive: true,
            }),
            "sensor.work": createMockEntityState("sensor.work", "0", {
              friendly_name: "Work",
            }),
            "zone.work": zones["zone.work"],
          })
        ).toBe(zones["zone.work"]);
      });

      it("does not select an arbitrary zone when names are identical", () => {
        const entity = createMockEntityState("person.anne", "Work", attributes);

        expect(getEntityActiveZone(entity, zones)).toBeUndefined();
      });
    }
  );

  it.each(["not_home", "unknown", "unavailable"])(
    "does not select a zone for the %s state",
    (state) => {
      const entity = createMockEntityState("person.anne", state, {
        in_zones: ["zone.work"],
      });

      expect(getEntityActiveZone(entity, zones)).toBeUndefined();
    }
  );

  it("resolves legacy home to the home zone even if another zone is named home", () => {
    const entity = createMockEntityState("person.anne", "home");
    const homeZone = createMockEntityState("zone.home", "0", {
      friendly_name: "My home",
    });

    expect(
      getEntityActiveZone(entity, {
        "zone.other_home": createMockEntityState("zone.other_home", "0", {
          friendly_name: "home",
        }),
        "zone.home": homeZone,
      })
    ).toBe(homeZone);
  });
});
