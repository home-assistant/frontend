import { ContextEvent } from "@lit/context";
import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AutomationConfig,
  BlueprintAutomationConfig,
  SidebarConfig,
  Trigger,
  TriggerCondition,
} from "../../../../../src/data/automation";
import { AutomationTriggerController } from "../../../../../src/panels/config/automation/trigger/automation-trigger-controller";
import {
  automationTriggerContext,
  type AutomationTriggerContext,
} from "../../../../../src/panels/config/automation/trigger/automation-trigger-id";

class TestHost extends LitElement {}
customElements.define("test-automation-trigger-host", TestHost);

declare global {
  interface HTMLElementTagNameMap {
    "test-automation-trigger-host": TestHost;
  }
}

// A stored blueprint automation: only `use_blueprint`, with input values.
const blueprint = (path: string, input: Record<string, unknown> = {}) =>
  ({ use_blueprint: { path, input } }) as unknown as BlueprintAutomationConfig;

const trigger = (id: string): Trigger => ({
  trigger: "event",
  event_type: id,
  id,
});

/** A fetch whose responses the test resolves or rejects in any order. */
const createFetch = () => {
  const pending: {
    resolve: (triggers: Trigger[] | undefined) => void;
    reject: (err: Error) => void;
  }[] = [];
  const fetch = vi.fn(
    () =>
      new Promise<Trigger[] | undefined>((resolve, reject) => {
        pending.push({ resolve, reject });
      })
  );
  return { fetch, pending };
};

describe("AutomationTriggerController with a blueprint automation", () => {
  let host: TestHost;
  let config: AutomationConfig;
  let fetch: ReturnType<typeof createFetch>;
  let commit: ReturnType<typeof vi.fn<(config: AutomationConfig) => void>>;
  let controller: AutomationTriggerController;

  // What a condition editor inside the automation receives.
  const context = (): AutomationTriggerContext => {
    let value: AutomationTriggerContext | undefined;
    const child = document.createElement("div");
    host.appendChild(child);
    child.dispatchEvent(
      new ContextEvent(automationTriggerContext, child, (v) => {
        value = v;
      })
    );
    child.remove();
    return value!;
  };

  const ids = () => context().options.map((option) => option.id);

  const condition = { condition: "trigger", id: [] } as TriggerCondition;

  // The host's update after the editor's config changes.
  const update = (next: AutomationConfig) => {
    config = next;
    controller.hostUpdate();
  };

  // Let timers and answered fetches run, then the update they request.
  const settle = async () => {
    await vi.runAllTimersAsync();
    controller.hostUpdate();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // Left out of the document, so only the test runs the host's updates.
    host = document.createElement("test-automation-trigger-host");
    fetch = createFetch();
    config = blueprint("motion.yaml");
    commit = vi.fn<(config: AutomationConfig) => void>();
    controller = new AutomationTriggerController(host, {
      getConfig: () => config,
      canEdit: () => true,
      commit,
      fetchBlueprintTriggers: fetch.fetch,
    });
  });

  afterEach(() => {
    controller.hostDisconnected();
    vi.useRealTimers();
  });

  it("offers the IDs of the blueprint's substituted triggers", async () => {
    update(blueprint("motion.yaml", { sensor: "binary_sensor.hall" }));
    expect(fetch.fetch).toHaveBeenCalledWith({
      path: "motion.yaml",
      input: { sensor: "binary_sensor.hall" },
    });
    fetch.pending[0].resolve([trigger("motion_on"), trigger("motion_off")]);
    await settle();

    expect(ids()).toEqual(["motion_on", "motion_off"]);
  });

  it("reports the options as loading until the triggers arrive", async () => {
    update(blueprint("motion.yaml"));
    expect(context().optionsStatus).toBe("loading");

    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    expect(context().optionsStatus).toBe("loaded");
  });

  it("reports a blueprint without triggers as loaded", async () => {
    update(blueprint("motion.yaml"));
    fetch.pending[0].resolve(undefined);
    await settle();

    expect(context().optionsStatus).toBe("loaded");
  });

  it("reports a blueprint that never substituted as failed", async () => {
    update(blueprint("motion.yaml"));
    fetch.pending[0].reject(new Error("Missing input sensor"));
    await settle();

    expect(ids()).toEqual([]);
    expect(context().optionsStatus).toBe("failed");
  });

  it("keeps the last triggers listed, as loading, while new inputs load", async () => {
    update(blueprint("motion.yaml", { id: "motion_on" }));
    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    update(blueprint("motion.yaml", { id: "motion_detected" }));

    expect(ids()).toEqual(["motion_on"]);
    expect(context().optionsStatus).toBe("loading");

    await vi.runAllTimersAsync();
    fetch.pending[1].resolve([trigger("motion_detected")]);
    await settle();

    expect(ids()).toEqual(["motion_detected"]);
    expect(context().optionsStatus).toBe("loaded");
  });

  it("numbers no triggers once a blueprint replaces an automation with an open sidebar", () => {
    update({
      triggers: [trigger("own")],
      conditions: [condition],
      actions: [],
    });
    controller.checkShowIndices({
      config: condition,
    } as unknown as SidebarConfig);
    expect(context().showIndices).toBe(true);

    // Switching to YAML removes the sidebar without reporting it.
    update(blueprint("motion.yaml"));

    expect(context().showIndices).toBe(false);
  });

  it("fetches again only when `use_blueprint` changes by value", async () => {
    update(blueprint("motion.yaml", { wait: 1 }));
    // YAML mode parses a new, equal object when another key is edited.
    update({ ...blueprint("motion.yaml", { wait: 1 }), alias: "Hall" });
    await vi.runAllTimersAsync();

    expect(fetch.fetch).toHaveBeenCalledOnce();
  });

  it("leaves a pick to the condition editor, since the condition is in an input", () => {
    expect(context().select(condition, ["motion_on"])).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("uses only the response for the latest inputs", async () => {
    update(blueprint("motion.yaml", { wait: 1 }));
    update(blueprint("motion.yaml", { wait: 2 }));
    await vi.runAllTimersAsync();
    expect(fetch.fetch).toHaveBeenCalledTimes(2);

    fetch.pending[1].resolve([trigger("latest")]);
    fetch.pending[0].resolve([trigger("stale")]);
    await settle();

    expect(ids()).toEqual(["latest"]);
  });

  it("keeps the last triggers when the inputs fail to substitute", async () => {
    update(blueprint("motion.yaml", { wait: 1 }));
    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    update(blueprint("motion.yaml", { wait: undefined }));
    await vi.runAllTimersAsync();
    fetch.pending[1].reject(new Error("Missing input wait"));
    await settle();

    expect(ids()).toEqual(["motion_on"]);
    expect(context().optionsStatus).toBe("failed");
  });

  it("drops the triggers of a blueprint that is no longer used", async () => {
    update(blueprint("motion.yaml"));
    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    update(blueprint("doorbell.yaml"));

    expect(ids()).toEqual([]);
  });

  it("offers nothing while `use_blueprint` is empty in YAML", () => {
    update({ use_blueprint: null } as unknown as BlueprintAutomationConfig);

    expect(ids()).toEqual([]);
    expect(fetch.fetch).not.toHaveBeenCalled();
  });

  it("handles picks again once the automation stops using a blueprint", () => {
    update(blueprint("motion.yaml"));
    update({
      triggers: [trigger("own")],
      conditions: [condition],
      actions: [],
    });

    expect(ids()).toEqual(["own"]);
    expect(context().optionsStatus).toBe("loaded");
    expect(context().select(condition, ["own"])).toBe(true);
    expect(commit).toHaveBeenCalledOnce();
  });
});
