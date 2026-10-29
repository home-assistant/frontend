import { describe, expect, it } from "vitest";
import { setAtPath } from "../../../src/common/util/config-path";

describe("setAtPath", () => {
  it("copies only the containers along the path", () => {
    const untouched = { trigger: "sun" };
    const config = {
      triggers: [untouched],
      actions: [{ delay: 5, alias: "Wait" }],
    };
    const copies: [object, object][] = [];

    const updated = setAtPath(config, ["actions", 0, "delay"], 6, (o, c) =>
      copies.push([o, c])
    );
    expect(updated).toEqual({
      triggers: [untouched],
      actions: [{ delay: 6, alias: "Wait" }],
    });
    expect(updated.triggers).toBe(config.triggers);
    expect(copies.map(([original]) => original)).toEqual([
      config.actions[0],
      config.actions,
      config,
    ]);

    const removed = setAtPath(config, ["actions", 0, "alias"], undefined);
    expect(removed.actions[0]).toEqual({ delay: 5 });
    expect("alias" in removed.actions[0]).toBe(false);
  });
});
