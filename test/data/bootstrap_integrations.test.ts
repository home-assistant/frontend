import {
  STATE_NOT_RUNNING,
  STATE_RUNNING,
  STATE_STARTING,
} from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import type { BootstrapProgress } from "../../src/data/bootstrap_integrations";
import {
  computeStartupProgress,
  startupTransition,
} from "../../src/data/bootstrap_integrations";

const progress = (
  overrides: Partial<BootstrapProgress> = {}
): BootstrapProgress => ({
  phase: "setup",
  elapsed: 12.4,
  integrations: { total: 40, done: 10, failed: [] },
  active: {},
  ...overrides,
});

describe("computeStartupProgress", () => {
  it("is indeterminate before the total is known", () => {
    const view = computeStartupProgress(undefined, STATE_NOT_RUNNING);
    expect(view.phase).toBe("preparing");
    expect(view.percent).toBeUndefined();
    expect(view.total).toBeNull();
    expect(view.finished).toBe(false);
  });

  it("lists concurrent setups by elapsed time and counts finished integrations", () => {
    const view = computeStartupProgress(
      progress({ active: { hue: 2.1, zwave_js: 8.5, met: 0.4 } }),
      STATE_NOT_RUNNING
    );
    expect(view.percent).toBe(25);
    expect(view.elapsed).toBe(12.4);
    expect(view.active.map(([domain]) => domain)).toEqual([
      "zwave_js",
      "hue",
      "met",
    ]);
  });

  it("is indeterminate during wrap up even when all integrations are done", () => {
    const view = computeStartupProgress(
      progress({
        phase: "wrap_up",
        integrations: { total: 40, done: 40, failed: [] },
      }),
      STATE_NOT_RUNNING
    );
    expect(view.percent).toBeUndefined();
    expect(view.elapsed).toBe(12.4);
    expect(view.done).toBe(40);
    expect(view.finished).toBe(false);
  });

  it("reports failed integrations separately from completion", () => {
    const view = computeStartupProgress(
      progress({
        phase: "wrap_up",
        integrations: { total: 3, done: 3, failed: ["auth", "broken"] },
      }),
      STATE_NOT_RUNNING
    );
    expect(view.done).toBe(3);
    expect(view.failed).toEqual(["auth", "broken"]);
  });

  it("follows the core state when the progress message lags behind", () => {
    const view = computeStartupProgress(
      progress({ phase: "wrap_up" }),
      STATE_STARTING
    );
    expect(view.phase).toBe("starting");
    expect(view.percent).toBeUndefined();
    expect(view.finished).toBe(false);
  });

  it("is only finished in the running state", () => {
    expect(
      computeStartupProgress(progress({ phase: "running" }), STATE_STARTING)
        .finished
    ).toBe(false);
    const view = computeStartupProgress(
      progress({ phase: "starting" }),
      STATE_RUNNING
    );
    expect(view.phase).toBe("running");
    expect(view.finished).toBe(true);
  });
});

describe("startupTransition", () => {
  it.each([
    [undefined, STATE_NOT_RUNNING, "show"],
    [undefined, STATE_STARTING, "show"],
    [undefined, STATE_RUNNING, "none"],
    [STATE_NOT_RUNNING, STATE_STARTING, "none"],
    [STATE_NOT_RUNNING, STATE_RUNNING, "finish"],
    [STATE_STARTING, STATE_RUNNING, "finish"],
    // Reconnected to a restarted core.
    [STATE_RUNNING, STATE_NOT_RUNNING, "show"],
    [STATE_RUNNING, STATE_RUNNING, "none"],
  ])("%s -> %s is %s", (oldState, newState, expected) => {
    expect(startupTransition(oldState, newState)).toBe(expected);
  });
});
