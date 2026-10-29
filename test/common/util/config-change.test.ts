import { describe, expect, it } from "vitest";
import {
  applyConfigChanges,
  diffConfigs,
  invertConfigChanges,
  mapConfigPath,
} from "../../../src/common/util/config-change";

// Undo replays these changes on the current config, so a wrong change
// silently undoes more or less than the user did.
describe("config changes", () => {
  const light = { action: "light.turn_on", data: { brightness: 10 } };
  const wait = { delay: 5 };
  const notify = { action: "notify.notify" };
  const config = {
    alias: "Evening",
    triggers: [{ trigger: "sun" }],
    actions: [light, wait, notify],
  };

  it("finds the smallest changes", () => {
    expect(diffConfigs(config, { ...config })).toEqual([]);

    expect(
      diffConfigs(config, {
        ...config,
        description: "Lights on",
        actions: [{ ...light, data: { brightness: 20 } }, wait, notify],
      })
    ).toEqual([
      {
        op: "replace",
        path: ["actions", 0, "data", "brightness"],
        before: 10,
        after: 20,
      },
      { op: "add", path: ["description"], value: "Lights on" },
    ]);

    expect(
      diffConfigs(config, { ...config, actions: [light, wait, wait, notify] })
    ).toEqual([{ op: "add", path: ["actions", 2], value: wait }]);

    expect(
      diffConfigs(config, { ...config, actions: [light, notify] })
    ).toEqual([{ op: "remove", path: ["actions", 1], value: wait }]);

    // Dragged into a block of the same list
    const block = { if: [], then: [light] };
    expect(
      diffConfigs(
        { actions: [wait, block, notify] },
        { actions: [wait, { ...block, then: [notify, light] }] }
      )
    ).toEqual([
      { op: "remove", path: ["actions", 2], value: notify },
      { op: "add", path: ["actions", 1, "then", 0], value: notify },
    ]);
    expect(
      diffConfigs(
        { actions: [block, wait, notify] },
        { actions: [{ ...block, then: [notify, light] }, wait] }
      )
    ).toEqual([
      { op: "remove", path: ["actions", 2], value: notify },
      { op: "add", path: ["actions", 0, "then", 0], value: notify },
    ]);

    // Compared by content, as the YAML editor creates new objects
    expect(
      diffConfigs(
        config,
        structuredClone({ ...config, actions: [wait, notify, light] })
      )
    ).toEqual([{ op: "move", from: ["actions", 0], path: ["actions", 2] }]);
  });

  it("applies and inverts changes", () => {
    const changed = {
      ...config,
      triggers: [],
      actions: [notify, light, { ...wait, delay: 6 }],
    };
    const changes = diffConfigs(config, changed);

    expect(applyConfigChanges(config, changes)).toEqual(changed);
    expect(applyConfigChanges(changed, invertConfigChanges(changes))).toEqual(
      config
    );

    const moved = applyConfigChanges(config, [
      { op: "move", from: ["actions", 2], path: ["actions", 0] },
    ]);
    expect(moved.actions).toEqual([notify, light, wait]);
    expect(moved.triggers).toBe(config.triggers);

    // A key holding undefined still counts, like in the dirty check
    const mode = { mode: "single" };
    const withMax = { mode: "restart", max: undefined };
    expect(
      Object.keys(
        applyConfigChanges(
          withMax,
          invertConfigChanges(diffConfigs(mode, withMax))
        )
      )
    ).toEqual(["mode"]);

    // Undo puts a removed key back where it was
    const { alias: _alias, ...withoutAlias } = config;
    expect(diffConfigs(config, withoutAlias)).toEqual([
      { op: "replace", path: [], before: config, after: withoutAlias },
    ]);
    const restored = applyConfigChanges(
      withoutAlias,
      invertConfigChanges(diffConfigs(config, withoutAlias))
    );
    expect(Object.keys(restored)).toEqual(Object.keys(config));

    const reordered = {
      ...config,
      actions: [{ data: light.data, action: light.action }, wait, notify],
    };
    expect(
      Object.keys(
        applyConfigChanges(config, diffConfigs(config, reordered)).actions[0]
      )
    ).toEqual(["data", "action"]);
  });

  it("follows a path through changes", () => {
    const row = ["actions", 1, "then", 2];

    expect(
      mapConfigPath(row, [
        { op: "add", path: ["actions", 0], value: wait },
        { op: "remove", path: ["actions", 2, "then", 0], value: wait },
        { op: "add", path: ["actions", 2, "alias"], value: "If" },
      ])
    ).toEqual(["actions", 2, "then", 1]);
    expect(
      mapConfigPath(row, [
        { op: "move", from: ["actions", 1], path: ["actions", 3] },
      ])
    ).toEqual(["actions", 3, "then", 2]);
    // The neighbour moving down moves the row up
    expect(
      mapConfigPath(
        ["actions", 1],
        [{ op: "move", from: ["actions", 0], path: ["actions", 1] }]
      )
    ).toEqual(["actions", 0]);
    expect(
      mapConfigPath(row, [{ op: "remove", path: ["actions", 1], value: wait }])
    ).toBeUndefined();
    expect(
      mapConfigPath(row, [
        { op: "replace", path: ["actions"], before: [], after: [] },
      ])
    ).toBeUndefined();
  });
});
