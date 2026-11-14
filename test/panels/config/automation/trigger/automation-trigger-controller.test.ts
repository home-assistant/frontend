import { ContextEvent } from "@lit/context";
import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AutomationConfig,
  BlueprintAutomationConfig,
  Trigger,
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
    controller = new AutomationTriggerController(host, {
      getConfig: () => config,
      canEdit: () => true,
      commit: vi.fn(),
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
    expect(context().blueprintStatus).toBe("loading");

    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    expect(context().blueprintStatus).toBe("loaded");
  });

  it("reports a blueprint whose triggers have no IDs as loaded", async () => {
    update(blueprint("motion.yaml"));
    fetch.pending[0].resolve([{ trigger: "event", event_type: "motion" }]);
    await settle();

    expect(ids()).toEqual([]);
    expect(context().blueprintStatus).toBe("loaded");
  });

  it("reports a blueprint that never substituted as failed", async () => {
    update(blueprint("motion.yaml"));
    fetch.pending[0].reject(new Error("Missing input sensor"));
    await settle();

    expect(ids()).toEqual([]);
    expect(context().blueprintStatus).toBe("failed");
  });

  it("keeps the last triggers listed, as loading, while new inputs load", async () => {
    update(blueprint("motion.yaml", { id: "motion_on" }));
    fetch.pending[0].resolve([trigger("motion_on")]);
    await settle();

    update(blueprint("motion.yaml", { id: "motion_detected" }));

    expect(ids()).toEqual(["motion_on"]);
    expect(context().blueprintStatus).toBe("loading");

    await vi.runAllTimersAsync();
    fetch.pending[1].resolve([trigger("motion_detected")]);
    await settle();

    expect(ids()).toEqual(["motion_detected"]);
    expect(context().blueprintStatus).toBe("loaded");
  });

  it("fetches again only when `use_blueprint` changes by value", async () => {
    update(blueprint("motion.yaml", { wait: 1 }));
    // YAML mode parses a new, equal object when another key is edited.
    update({ ...blueprint("motion.yaml", { wait: 1 }), alias: "Hall" });
    await vi.runAllTimersAsync();

    expect(fetch.fetch).toHaveBeenCalledOnce();
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
    expect(context().blueprintStatus).toBe("failed");
  });
});
