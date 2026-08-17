import { describe, expect, it } from "vitest";
import type {
  BuildSankeyDeviceNodesOptions,
  SankeyDeviceNode,
} from "../../../../../../src/panels/lovelace/cards/energy/common/sankey";
import {
  buildSankeyDeviceNodes,
  buildSankeyLayout,
  DEFAULT_MAX_SANKEY_DEVICES,
  getSankeyDeviceSections,
  groupSankeyDevicesByFloorAndArea,
} from "../../../../../../src/panels/lovelace/cards/energy/common/sankey";
import type { Node } from "../../../../../../src/components/chart/ha-sankey-chart";
import type { DeviceConsumptionEnergyPreference } from "../../../../../../src/data/energy";
import type { HomeAssistant } from "../../../../../../src/types";
import { createMockComputedStyle } from "../../../../../fixtures/computed-style";
import {
  createMockEntityState,
  createMockHass,
  mockLocalize,
} from "../../../../../fixtures/hass";

const computedStyle = createMockComputedStyle();

const devices = (
  ...items: DeviceConsumptionEnergyPreference[]
): DeviceConsumptionEnergyPreference[] => items;

// Cumulative-style option factory (id === stat_consumption, always clickable).
const cumulativeOpts = (
  overrides: { values: Record<string, number> } & Pick<
    BuildSankeyDeviceNodesOptions,
    "devices"
  > &
    Partial<BuildSankeyDeviceNodesOptions>
): BuildSankeyDeviceNodesOptions => {
  const { values, ...rest } = overrides;
  return {
    computedStyle,
    localize: mockLocalize,
    rootNodeId: "home",
    minThreshold: 0.01,
    untrackedFloor: 0,
    ceilOtherValue: false,
    initialUntracked: 0,
    getId: (device) => device.stat_consumption,
    getValue: (id) => values[id] ?? 0,
    getLabel: (id, name) => name || id,
    getEntityId: (id) => id,
    ...rest,
  };
};

describe("getSankeyDeviceSections", () => {
  it("returns a single section when there are no parent links", () => {
    const nodes: Node[] = [
      { id: "a", value: 1, index: 4 },
      { id: "b", value: 2, index: 4 },
    ];
    expect(getSankeyDeviceSections({}, nodes)).toEqual([nodes]);
  });

  it("splits parents and children into ordered sections", () => {
    const parent: Node = { id: "parent", value: 10, index: 4 };
    const child: Node = { id: "child", value: 4, index: 4 };
    const sections = getSankeyDeviceSections({ child: "parent" }, [
      parent,
      child,
    ]);
    expect(sections).toEqual([[parent], [child]]);
  });

  it("recurses through multiple parent levels", () => {
    const grandparent: Node = { id: "grandparent", value: 10, index: 4 };
    const parent: Node = { id: "parent", value: 6, index: 4 };
    const child: Node = { id: "child", value: 4, index: 4 };
    const sections = getSankeyDeviceSections(
      { parent: "grandparent", child: "parent" },
      [grandparent, parent, child]
    );
    expect(sections).toEqual([[grandparent], [parent], [child]]);
  });
});

describe("buildSankeyDeviceNodes", () => {
  it("renders top-level devices and subtracts them from untracked", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices({ stat_consumption: "a" }, { stat_consumption: "b" }),
        values: { a: 10, b: 5 },
        initialUntracked: 15,
      })
    );
    expect(result.deviceNodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(result.untrackedConsumption).toBe(0);
    // top-level devices carry no link here (linked in the layout step)
    expect(result.links).toEqual([]);
    expect(result.parentLinks).toEqual({});
  });

  it("shows a lone sub-threshold device directly (no Other node)", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "a" },
          { stat_consumption: "small" }
        ),
        values: { a: 10, small: 0.005 },
        initialUntracked: 10.005,
      })
    );
    expect(result.deviceNodes.map((n) => n.id).sort()).toEqual(["a", "small"]);
    expect(result.deviceNodes.some((n) => n.id.startsWith("other_"))).toBe(
      false
    );
    expect(result.untrackedConsumption).toBeCloseTo(0, 10);
  });

  it("groups multiple sub-threshold devices into an Other node", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "s1" },
          { stat_consumption: "s2" }
        ),
        values: { s1: 0.003, s2: 0.004 },
        initialUntracked: 0.007,
      })
    );
    expect(result.deviceNodes).toHaveLength(1);
    const other = result.deviceNodes[0];
    expect(other.id).toBe("other_home");
    expect(other.value).toBeCloseTo(0.007, 10);
    expect(result.untrackedConsumption).toBeCloseTo(0, 10);
  });

  it("ceils the Other node value only when ceilOtherValue is set, but always subtracts the raw total", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "s1" },
          { stat_consumption: "s2" }
        ),
        values: { s1: 0.3, s2: 0.4 },
        minThreshold: 1,
        ceilOtherValue: true,
        initialUntracked: 0.7,
      })
    );
    const other = result.deviceNodes[0];
    expect(other.value).toBe(1); // Math.ceil(0.7)
    expect(result.untrackedConsumption).toBeCloseTo(0, 10); // raw 0.7 subtracted
  });

  it("skips devices whose id resolves to undefined (instantaneous with no stat_rate)", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "a", stat_rate: undefined },
          { stat_consumption: "b", stat_rate: "sensor.b_rate" }
        ),
        values: { "sensor.b_rate": 10 },
        initialUntracked: 10,
        getId: (device) => device.stat_rate,
      })
    );
    expect(result.deviceNodes.map((n) => n.id)).toEqual(["sensor.b_rate"]);
    expect(result.untrackedConsumption).toBe(0);
  });

  it("resolves the parent to its node id, not its stat_consumption", () => {
    // Instantaneous cards key the hierarchy by stat_consumption but render
    // stat_rate, so the effective parent must come back as the stat_rate.
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "p", stat_rate: "sensor.p" },
          {
            stat_consumption: "c",
            stat_rate: "sensor.c",
            included_in_stat: "p",
          }
        ),
        values: { "sensor.p": 100, "sensor.c": 40 },
        minThreshold: 1,
        initialUntracked: 100,
        getId: (device) => device.stat_rate,
      })
    );
    expect(result.parentLinks["sensor.c"]).toBe("sensor.p");
    expect(result.links).toContainEqual({
      source: "sensor.p",
      target: "sensor.c",
    });
    expect(result.untrackedConsumption).toBe(0); // only the top-level parent
  });

  it("walks through an intermediate device that has no node id", () => {
    // "middle" has no stat_rate, so the child must attach to the grandparent.
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "p", stat_rate: "sensor.p" },
          { stat_consumption: "middle", included_in_stat: "p" },
          {
            stat_consumption: "c",
            stat_rate: "sensor.c",
            included_in_stat: "middle",
          }
        ),
        values: { "sensor.p": 100, "sensor.c": 40 },
        minThreshold: 1,
        initialUntracked: 100,
        getId: (device) => device.stat_rate,
      })
    );
    expect(result.parentLinks["sensor.c"]).toBe("sensor.p");
    expect(result.untrackedConsumption).toBe(0);
  });

  it("adds a per-parent untracked residual above the floor", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "parent" },
          { stat_consumption: "child", included_in_stat: "parent" }
        ),
        values: { parent: 10, child: 4 },
        initialUntracked: 10,
      })
    );
    expect(result.parentLinks.child).toBe("parent");
    const residual = result.deviceNodes.find((n) =>
      n.id.startsWith("untracked_")
    );
    expect(residual?.id).toBe("untracked_parent");
    expect(residual?.value).toBe(6); // 10 - 4
    expect(result.untrackedConsumption).toBe(0); // parent (top-level) subtracted
  });

  it("suppresses a per-parent residual at or below the floor", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "parent" },
          { stat_consumption: "child", included_in_stat: "parent" }
        ),
        values: { parent: 10, child: 9.5 },
        untrackedFloor: 1,
        initialUntracked: 10,
      })
    );
    expect(result.deviceNodes.some((n) => n.id.startsWith("untracked_"))).toBe(
      false
    );
  });

  it("groups a small-device cluster under its rendered parent, not into untracked", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "parent" },
          { stat_consumption: "s1", included_in_stat: "parent" },
          { stat_consumption: "s2", included_in_stat: "parent" }
        ),
        values: { parent: 10, s1: 0.003, s2: 0.004 },
        initialUntracked: 10,
      })
    );
    const other = result.deviceNodes.find((n) => n.id === "other_parent");
    expect(other?.value).toBeCloseTo(0.007, 10);
    expect(result.parentLinks.other_parent).toBe("parent");
    expect(result.links).toContainEqual({
      source: "parent",
      target: "other_parent",
    });
    // The cluster attaches to its parent, so home-level untracked only loses
    // the top-level parent (10), never the cluster total.
    expect(result.untrackedConsumption).toBe(0);
  });

  it("counts a nested small device only once (via its small ancestor)", () => {
    // child's consumption is already included in parent's statistic
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "parent" },
          { stat_consumption: "child", included_in_stat: "parent" }
        ),
        values: { parent: 0.008, child: 0.006 },
        initialUntracked: 10,
      })
    );
    // Only the parent remains, so it is shown directly instead of "Other"
    expect(result.deviceNodes.map((n) => n.id)).toEqual(["parent"]);
    expect(result.deviceNodes[0].value).toBeCloseTo(0.008, 10);
    expect(result.untrackedConsumption).toBeCloseTo(10 - 0.008, 10);
  });

  it("excludes nested small devices from the Other total", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "parent" },
          { stat_consumption: "child", included_in_stat: "parent" },
          { stat_consumption: "unrelated" }
        ),
        values: { parent: 0.004, child: 0.003, unrelated: 0.002 },
        initialUntracked: 10,
      })
    );
    const other = result.deviceNodes.find((n) => n.id === "other_home");
    // parent + unrelated only; child is inside parent's value
    expect(other?.value).toBeCloseTo(0.006, 10);
    expect(result.untrackedConsumption).toBeCloseTo(10 - 0.006, 10);
  });

  it("keeps only the top ancestor of a nested small-device chain", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "grandparent" },
          { stat_consumption: "parent", included_in_stat: "grandparent" },
          { stat_consumption: "child", included_in_stat: "parent" }
        ),
        values: { grandparent: 0.005, parent: 0.004, child: 0.003 },
        initialUntracked: 10,
      })
    );
    expect(result.deviceNodes.map((n) => n.id)).toEqual(["grandparent"]);
    expect(result.untrackedConsumption).toBeCloseTo(10 - 0.005, 10);
  });

  it("detects a small ancestor across a device the card skips entirely", () => {
    // Power-card scenario: "outlet" has no stat_rate so it is never rendered
    // or collected, but the plug's consumption still flows through it into
    // the heater group. Requires walking the chain, not a direct-parent check.
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "heater_group" },
          { stat_consumption: "outlet", included_in_stat: "heater_group" },
          { stat_consumption: "plug", included_in_stat: "outlet" }
        ),
        values: { heater_group: 0.008, plug: 0.005 },
        initialUntracked: 10,
        getId: (device) =>
          device.stat_consumption === "outlet"
            ? undefined
            : device.stat_consumption,
      })
    );
    expect(result.deviceNodes.map((n) => n.id)).toEqual(["heater_group"]);
    expect(result.untrackedConsumption).toBeCloseTo(10 - 0.008, 10);
  });

  it("excludes a nested small device from a rendered parent's cluster", () => {
    // big(rendered) > b(small) > c(small): c is inside b's value, so only b
    // may be attributed under big.
    const devs = devices(
      { stat_consumption: "big" },
      { stat_consumption: "b", included_in_stat: "big" },
      { stat_consumption: "c", included_in_stat: "b" }
    );
    const values = { big: 10, b: 0.004, c: 0.003 };
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devs,
        values,
        initialUntracked: 10,
      })
    );
    // b is the lone survivor, so it is shown directly instead of "Other"
    expect(result.deviceNodes.map((n) => n.id)).toEqual([
      "big",
      "b",
      "untracked_big",
    ]);
    expect(result.parentLinks.b).toBe("big");
    expect(
      result.deviceNodes.find((n) => n.id === "untracked_big")?.value
    ).toBeCloseTo(10 - 0.004, 10);
    expect(result.untrackedConsumption).toBe(0);
  });

  it("keeps a small device whose chain reaches a small ancestor past a rendered one", () => {
    // g(small) > a(rendered) > c(small): c hangs off rendered a, so it never
    // touches untracked and cannot be double-counted through g.
    const devs = devices(
      { stat_consumption: "g" },
      { stat_consumption: "a", included_in_stat: "g" },
      { stat_consumption: "c", included_in_stat: "a" }
    );
    const values = { g: 0.0005, a: 0.5, c: 0.0004 };
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devs,
        values,
        initialUntracked: 1,
      })
    );
    expect(result.deviceNodes.map((n) => n.id)).toEqual([
      "a",
      "g",
      "c",
      "untracked_a",
    ]);
    expect(result.parentLinks.c).toBe("a");
    // only the two top-level values (a and g) come off untracked
    expect(result.untrackedConsumption).toBeCloseTo(1 - 0.5 - 0.0005, 10);
  });

  it("leaves a cyclic small-device cluster in untracked instead of looping", () => {
    const result = buildSankeyDeviceNodes(
      cumulativeOpts({
        devices: devices(
          { stat_consumption: "a", included_in_stat: "b" },
          { stat_consumption: "b", included_in_stat: "a" }
        ),
        values: { a: 0.003, b: 0.004 },
        initialUntracked: 10,
      })
    );
    expect(result.deviceNodes).toEqual([]);
    expect(result.untrackedConsumption).toBe(10);
  });

  describe("device count cap", () => {
    // Five devices all comfortably above minThreshold, so only the count cap
    // can group any of them.
    const fiveDevices = () =>
      devices(
        { stat_consumption: "a" },
        { stat_consumption: "b" },
        { stat_consumption: "c" },
        { stat_consumption: "d" },
        { stat_consumption: "e" }
      );
    const fiveValues = { a: 50, b: 40, c: 30, d: 20, e: 10 };

    const namedIds = (result: { deviceNodes: SankeyDeviceNode[] }) =>
      result.deviceNodes
        .filter(
          (n) => !n.id.startsWith("other_") && !n.id.startsWith("untracked_")
        )
        .map((n) => n.id);

    it("does not group anything when maxDevices is unset", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: fiveDevices(),
          values: fiveValues,
          initialUntracked: 150,
        })
      );
      expect(namedIds(result)).toEqual(["a", "b", "c", "d", "e"]);
      expect(result.deviceNodes.some((n) => n.id.startsWith("other_"))).toBe(
        false
      );
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("does nothing at exactly the cap", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "a" },
            { stat_consumption: "b" },
            { stat_consumption: "c" }
          ),
          values: { a: 50, b: 40, c: 30 },
          maxDevices: 3,
          initialUntracked: 120,
        })
      );
      expect(namedIds(result)).toEqual(["a", "b", "c"]);
      expect(result.deviceNodes.some((n) => n.id.startsWith("other_"))).toBe(
        false
      );
    });

    it("groups the smallest above the cap, keeping the cap many by name", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: fiveDevices(),
          values: fiveValues,
          maxDevices: 3,
          initialUntracked: 150,
        })
      );
      // the cap budgets named devices; Other is overhead on top
      expect(namedIds(result)).toEqual(["a", "b", "c"]);
      const other = result.deviceNodes.find((n) => n.id === "other_home");
      expect(other?.value).toBeCloseTo(30, 10);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("never demotes exactly one device, which would render it by name", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "a" },
            { stat_consumption: "b" },
            { stat_consumption: "c" },
            { stat_consumption: "d" }
          ),
          values: { a: 40, b: 30, c: 20, d: 10 },
          maxDevices: 3,
          initialUntracked: 100,
        })
      );
      expect(namedIds(result)).toEqual(["a", "b"]);
      const other = result.deviceNodes.find((n) => n.id === "other_home");
      expect(other?.value).toBeCloseTo(30, 10);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("demotes a whole subtree so children never re-parent or double count", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "g" },
            { stat_consumption: "a", included_in_stat: "g" },
            { stat_consumption: "c", included_in_stat: "a" },
            { stat_consumption: "b1", included_in_stat: "g" },
            { stat_consumption: "b2", included_in_stat: "g" },
            { stat_consumption: "b3", included_in_stat: "g" },
            { stat_consumption: "b4", included_in_stat: "g" }
          ),
          values: { g: 100, a: 10, c: 9, b1: 30, b2: 25, b3: 20, b4: 8 },
          maxDevices: 3,
          initialUntracked: 100,
        })
      );
      expect(result.deviceNodes.map((n) => n.id)).toEqual([
        "g",
        "b1",
        "b2",
        "b3",
        "other_g",
        "untracked_g",
      ]);
      // a's value already contains c, so Other is 10 + 8 and not 27
      const other = result.deviceNodes.find((n) => n.id === "other_g");
      expect(other?.value).toBeCloseTo(18, 10);
      expect(result.deviceNodes.some((n) => n.id === "c")).toBe(false);
      const untracked = result.deviceNodes.find((n) => n.id === "untracked_g");
      expect(untracked?.value).toBeCloseTo(7, 10);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("ranks by raw value, so a parent is never demoted before its own child", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "d" },
            { stat_consumption: "e", included_in_stat: "d" },
            { stat_consumption: "f" },
            { stat_consumption: "h" },
            { stat_consumption: "i" }
          ),
          values: { d: 50, e: 45, f: 10, h: 40, i: 30 },
          maxDevices: 3,
          initialUntracked: 130,
        })
      );
      // Ranking on value-excluding-children would demote d (50 - 45 = 5) while
      // keeping e, counting e both on its own and inside d's rolled-up value.
      expect(result.deviceNodes.map((n) => n.id)).toEqual([
        "d",
        "e",
        "h",
        "other_home",
        "untracked_d",
      ]);
      expect(result.parentLinks.e).toBe("d");
      const other = result.deviceNodes.find((n) => n.id === "other_home");
      expect(other?.value).toBeCloseTo(40, 10);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("applies the cap per parent and links Other to that parent", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "p" },
            { stat_consumption: "c1", included_in_stat: "p" },
            { stat_consumption: "c2", included_in_stat: "p" },
            { stat_consumption: "c3", included_in_stat: "p" },
            { stat_consumption: "c4", included_in_stat: "p" },
            { stat_consumption: "c5", included_in_stat: "p" },
            { stat_consumption: "r1" },
            { stat_consumption: "r2" }
          ),
          values: {
            p: 100,
            c1: 30,
            c2: 25,
            c3: 20,
            c4: 15,
            c5: 10,
            r1: 50,
            r2: 40,
          },
          maxDevices: 3,
          initialUntracked: 190,
        })
      );
      // p is over the cap; the three root-level nodes are exactly at it
      expect(namedIds(result)).toEqual(["p", "c1", "c2", "c3", "r1", "r2"]);
      const other = result.deviceNodes.find((n) => n.id === "other_p");
      expect(other?.value).toBeCloseTo(25, 10);
      expect(result.parentLinks.other_p).toBe("p");
      expect(result.links).toContainEqual({ source: "p", target: "other_p" });
      expect(result.deviceNodes.some((n) => n.id === "other_home")).toBe(false);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("counts only rendered children, not ones already below the threshold", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "p" },
            { stat_consumption: "c1", included_in_stat: "p" },
            { stat_consumption: "c2", included_in_stat: "p" },
            { stat_consumption: "c3", included_in_stat: "p" },
            { stat_consumption: "s1", included_in_stat: "p" },
            { stat_consumption: "s2", included_in_stat: "p" },
            { stat_consumption: "s3", included_in_stat: "p" }
          ),
          values: {
            p: 100,
            c1: 30,
            c2: 25,
            c3: 20,
            s1: 0.001,
            s2: 0.002,
            s3: 0.003,
          },
          maxDevices: 3,
          initialUntracked: 100,
        })
      );
      // three rendered children is at the cap, so no demotion happens
      expect(namedIds(result)).toEqual(["p", "c1", "c2", "c3"]);
      const other = result.deviceNodes.find((n) => n.id === "other_p");
      expect(other?.value).toBeCloseTo(0.006, 10);
    });

    it("terminates on a cyclic included_in_stat and leaves it unchanged", () => {
      const cyclic = () =>
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "a", included_in_stat: "b" },
            { stat_consumption: "b", included_in_stat: "a" }
          ),
          values: { a: 5, b: 4 },
          initialUntracked: 10,
        });
      // A cycle member always has a rendered parent inside the cycle, so it is
      // never reachable from the root and the cap cannot touch it.
      expect(
        buildSankeyDeviceNodes({ ...cyclic(), maxDevices: 1 })
      ).toStrictEqual(buildSankeyDeviceNodes(cyclic()));
    });

    it("treats a zero or non-finite cap as no cap", () => {
      [0, Number.NaN, Number.POSITIVE_INFINITY].forEach((maxDevices) => {
        const result = buildSankeyDeviceNodes(
          cumulativeOpts({
            devices: fiveDevices(),
            values: fiveValues,
            maxDevices,
            initialUntracked: 150,
          })
        );
        expect(namedIds(result)).toEqual(["a", "b", "c", "d", "e"]);
      });
    });

    it("does not count devices without a node id (instantaneous cards)", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: devices(
            { stat_consumption: "a", stat_rate: "ra" },
            { stat_consumption: "b", stat_rate: "rb" },
            { stat_consumption: "c", stat_rate: "rc" },
            { stat_consumption: "d" }
          ),
          values: { ra: 30, rb: 25, rc: 20 },
          getId: (device) => device.stat_rate,
          maxDevices: 3,
          initialUntracked: 75,
        })
      );
      // d has no stat_rate, so the three rendered nodes are at the cap
      expect(namedIds(result)).toEqual(["ra", "rb", "rc"]);
      expect(result.deviceNodes.some((n) => n.id.startsWith("other_"))).toBe(
        false
      );
    });

    it("ceils the capped Other value but still subtracts the raw total", () => {
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: fiveDevices(),
          values: { ...fiveValues, e: 10.5 },
          maxDevices: 3,
          ceilOtherValue: true,
          initialUntracked: 150.5,
        })
      );
      const other = result.deviceNodes.find((n) => n.id === "other_home");
      expect(other?.value).toBe(31);
      expect(result.untrackedConsumption).toBeCloseTo(0, 10);
    });

    it("breaks value ties on declaration order, stably across runs", () => {
      const opts = () =>
        cumulativeOpts({
          devices: fiveDevices(),
          values: { a: 50, b: 20, c: 20, d: 20, e: 10 },
          maxDevices: 3,
          initialUntracked: 120,
        });
      expect(namedIds(buildSankeyDeviceNodes(opts()))).toEqual(["a", "c", "d"]);
      expect(namedIds(buildSankeyDeviceNodes(opts()))).toEqual(["a", "c", "d"]);
    });

    // The documented promise is "more than 20 devices start grouping", so pin
    // the boundary against the real default rather than a test-local cap.
    it.each([
      [DEFAULT_MAX_SANKEY_DEVICES, DEFAULT_MAX_SANKEY_DEVICES, false],
      // one over the cap still demotes two, because a lone demoted device would
      // be rendered by name and void the cap
      [DEFAULT_MAX_SANKEY_DEVICES + 1, DEFAULT_MAX_SANKEY_DEVICES - 1, true],
      [DEFAULT_MAX_SANKEY_DEVICES + 2, DEFAULT_MAX_SANKEY_DEVICES, true],
      [DEFAULT_MAX_SANKEY_DEVICES + 12, DEFAULT_MAX_SANKEY_DEVICES, true],
    ])(
      "with %i devices at the default cap renders %i named nodes (grouped: %s)",
      (deviceCount, expectedNamed, expectOther) => {
        const list = Array.from({ length: deviceCount }, (_, i) => ({
          stat_consumption: `d${i}`,
        }));
        const values = Object.fromEntries(
          list.map((d, i) => [d.stat_consumption, 10 + i])
        );
        const total = Object.values(values).reduce((s, v) => s + v, 0);
        const result = buildSankeyDeviceNodes(
          cumulativeOpts({
            devices: list,
            values,
            maxDevices: DEFAULT_MAX_SANKEY_DEVICES,
            initialUntracked: total,
          })
        );
        expect(namedIds(result)).toHaveLength(expectedNamed);
        expect(result.deviceNodes.some((n) => n.id === "other_home")).toBe(
          expectOther
        );
        // grouping never changes the total that comes off the root
        expect(result.untrackedConsumption).toBeCloseTo(0, 10);
      }
    );

    it("keeps 32 circuit clamps readable at the default cap", () => {
      const clamps = Array.from({ length: 32 }, (_, i) => ({
        stat_consumption: `clamp_${i}`,
      }));
      const values = Object.fromEntries(
        clamps.map((clamp, i) => [clamp.stat_consumption, 20 + i])
      );
      const result = buildSankeyDeviceNodes(
        cumulativeOpts({
          devices: clamps,
          values,
          maxDevices: DEFAULT_MAX_SANKEY_DEVICES,
          initialUntracked: 1200,
        })
      );
      expect(namedIds(result)).toHaveLength(DEFAULT_MAX_SANKEY_DEVICES);
      expect(result.deviceNodes).toHaveLength(DEFAULT_MAX_SANKEY_DEVICES + 1);
      // the 12 smallest clamps, values 20 through 31
      const other = result.deviceNodes.find((n) => n.id === "other_home");
      expect(other?.value).toBeCloseTo(306, 10);

      // flow conservation: every device node plus untracked accounts for home
      const { nodes } = buildSankeyLayout({
        hass: createMockHass(),
        computedStyle,
        localize: mockLocalize,
        deviceNodes: result.deviceNodes,
        parentLinks: result.parentLinks,
        rootNodeId: "home",
        groupByFloor: false,
        groupByArea: false,
        untrackedConsumption: result.untrackedConsumption,
        untrackedFloor: 0,
      });
      const deviceTotal = nodes
        .filter((n) => n.index === 4)
        .reduce((sum, n) => sum + n.value, 0);
      expect(deviceTotal).toBeCloseTo(1200, 10);
    });
  });
});

describe("groupSankeyDevicesByFloorAndArea", () => {
  const hass = {
    ...createMockHass({
      "sensor.a": createMockEntityState("sensor.a", "1"),
      "sensor.b": createMockEntityState("sensor.b", "2"),
    }),
    entities: {
      "sensor.a": { entity_id: "sensor.a", area_id: "kitchen" },
    },
    areas: {
      kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
    },
    floors: {
      ground: { floor_id: "ground", name: "Ground", level: 0 },
    },
  } as unknown as HomeAssistant;

  it("buckets devices by their entity's area and floor, unknown ones under no_area", () => {
    const nodes: Node[] = [
      { id: "sensor.a", value: 3, index: 4 },
      { id: "sensor.b", value: 2, index: 4 },
    ];
    const { areas, floors } = groupSankeyDevicesByFloorAndArea(hass, nodes);
    expect(areas.kitchen.value).toBe(3);
    expect(areas.kitchen.devices.map((n) => n.id)).toEqual(["sensor.a"]);
    expect(floors.ground.value).toBe(3);
    expect(floors.ground.areas).toContain("kitchen");
    // sensor.b has no registry entry -> no_area
    expect(areas.no_area.devices.map((n) => n.id)).toEqual(["sensor.b"]);
  });
});

describe("buildSankeyLayout", () => {
  const hass = createMockHass();

  it("links top-level devices to the root and emits the untracked node above the floor", () => {
    const deviceNodes: SankeyDeviceNode[] = [{ id: "a", value: 10, index: 4 }];
    const { nodes, links } = buildSankeyLayout({
      hass,
      computedStyle,
      localize: mockLocalize,
      deviceNodes,
      parentLinks: {},
      rootNodeId: "home",
      groupByFloor: false,
      groupByArea: false,
      untrackedConsumption: 2,
      untrackedFloor: 0,
    });
    expect(links).toContainEqual({ source: "home", target: "a", value: 10 });
    const untracked = nodes.find((n) => n.id === "untracked");
    expect(untracked?.value).toBe(2);
    expect(links).toContainEqual({
      source: "home",
      target: "untracked",
      value: 2,
    });
  });

  it("suppresses the untracked node at or below the floor", () => {
    const { nodes } = buildSankeyLayout({
      hass,
      computedStyle,
      localize: mockLocalize,
      deviceNodes: [{ id: "a", value: 10, index: 4 }],
      parentLinks: {},
      rootNodeId: "home",
      groupByFloor: false,
      groupByArea: false,
      untrackedConsumption: 0.5,
      untrackedFloor: 1,
    });
    expect(nodes.some((n) => n.id === "untracked")).toBe(false);
  });

  it("honors a non-home root node id (single-source water-flow case)", () => {
    const { links } = buildSankeyLayout({
      hass,
      computedStyle,
      localize: mockLocalize,
      deviceNodes: [{ id: "a", value: 4, index: 4 }],
      parentLinks: {},
      rootNodeId: "sensor.source",
      groupByFloor: false,
      groupByArea: false,
      untrackedConsumption: 0,
      untrackedFloor: 1,
    });
    expect(links).toContainEqual({
      source: "sensor.source",
      target: "a",
      value: 4,
    });
  });

  it("numbers device sections and the untracked node by section depth", () => {
    const { nodes } = buildSankeyLayout({
      hass,
      computedStyle,
      localize: mockLocalize,
      deviceNodes: [
        { id: "parent", value: 10, index: 4 },
        { id: "child", value: 4, index: 4 },
      ],
      parentLinks: { child: "parent" },
      rootNodeId: "home",
      groupByFloor: false,
      groupByArea: false,
      untrackedConsumption: 2,
      untrackedFloor: 0,
    });
    // section 0 -> index 4, section 1 -> index 5
    expect(nodes.find((n) => n.id === "parent")?.index).toBe(4);
    expect(nodes.find((n) => n.id === "child")?.index).toBe(5);
    // untracked sits at 3 + deviceSections.length (2)
    expect(nodes.find((n) => n.id === "untracked")?.index).toBe(5);
  });

  it("builds floor and area nodes and links devices through them", () => {
    const groupedHass = {
      ...createMockHass({
        "sensor.a": createMockEntityState("sensor.a", "3"),
        "sensor.b": createMockEntityState("sensor.b", "2"),
      }),
      entities: {
        "sensor.a": { entity_id: "sensor.a", area_id: "kitchen" },
      },
      areas: {
        kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
      },
      floors: {
        ground: { floor_id: "ground", name: "Ground", level: 0 },
      },
    } as unknown as HomeAssistant;

    const { nodes, links } = buildSankeyLayout({
      hass: groupedHass,
      computedStyle,
      localize: mockLocalize,
      deviceNodes: [
        { id: "sensor.a", value: 3, index: 4 },
        { id: "sensor.b", value: 2, index: 4 },
      ],
      parentLinks: {},
      rootNodeId: "home",
      groupByFloor: true,
      groupByArea: true,
      untrackedConsumption: 0,
      untrackedFloor: 0,
    });

    const floor = nodes.find((n) => n.id === "floor_ground");
    expect(floor?.index).toBe(2);
    expect(floor?.value).toBe(3);
    const area = nodes.find((n) => n.id === "area_kitchen");
    expect(area?.index).toBe(3);
    expect(area?.value).toBe(3);
    // root -> floor -> area -> device
    expect(links).toContainEqual({ source: "home", target: "floor_ground" });
    expect(links).toContainEqual({
      source: "floor_ground",
      target: "area_kitchen",
      value: 3,
    });
    expect(links).toContainEqual({
      source: "area_kitchen",
      target: "sensor.a",
      value: 3,
    });
    // sensor.b has no registry entry -> no_area -> linked straight to root
    expect(links).toContainEqual({
      source: "home",
      target: "sensor.b",
      value: 2,
    });
  });
});
