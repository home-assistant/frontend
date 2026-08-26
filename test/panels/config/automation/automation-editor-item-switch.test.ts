import { describe, expect, test, vi } from "vitest";

import "../../../../src/panels/config/automation/ha-automation-editor";
import type { HaAutomationEditor } from "../../../../src/panels/config/automation/ha-automation-editor";
import type { AutomationConfig } from "../../../../src/data/automation";
import { createMockHass } from "../../../fixtures/hass";
import { flush, runUpdated } from "../../../fixtures/lit";

const configFor = (alias: string): AutomationConfig => ({
  alias,
  triggers: [],
  conditions: [],
  actions: [],
});

const createEditor = (): any => {
  const el = document.createElement(
    "ha-automation-editor"
  ) as HaAutomationEditor;
  const hass = createMockHass();
  (hass as any).callApi = vi.fn(async (_method: string, path: string) =>
    configFor(path.split("/").pop()!)
  );
  (hass as any).callWS = vi.fn(async () => ({ config: configFor("state") }));
  el.hass = hass;
  el.automations = [];
  return el;
};

describe("automation editor item switch", () => {
  test("switching to another automation resets the editor state", async () => {
    const el = createEditor();
    el.automationId = "a";
    runUpdated(el, { automationId: undefined });
    await flush();
    expect(el.config?.alias).toBe("a");

    el.mode = "yaml";
    el.yamlErrors = "unparseable";
    el.errors = "save failed";
    el._undoRedoController.commit(configFor("a-edited"));
    expect(el._undoRedoController.canUndo).toBe(true);

    el.automationId = "b";
    runUpdated(el, { automationId: "a" });

    expect(el.mode).toBe("gui");
    expect(el.yamlErrors).toBeUndefined();
    expect(el.errors).toBeUndefined();
    expect(el._undoRedoController.canUndo).toBe(false);
    await flush();
    expect(el.config?.alias).toBe("b");
    expect(el.isDirtyState).toBe(false);
  });

  test("keeps state when the id change comes from saving a new automation", async () => {
    const el = createEditor();
    el.automationId = null;
    runUpdated(el, { automationId: undefined });
    expect(el.config).toBeDefined();

    el.mode = "yaml";
    el.justSavedId = "123";
    el.automationId = "123";
    runUpdated(el, { automationId: null });

    expect(el.mode).toBe("yaml");
    expect(el.justSavedId).toBeUndefined();
    await flush();
    expect(el.config?.alias).toBe("123");
  });

  test("resets when leaving an unsaved new automation for an existing one", () => {
    const el = createEditor();
    el.automationId = null;
    runUpdated(el, { automationId: undefined });
    el.mode = "yaml";

    el.automationId = "b";
    runUpdated(el, { automationId: null });

    expect(el.mode).toBe("gui");
  });

  test("resets when switching from an existing automation to a new one", async () => {
    const el = createEditor();
    el.automationId = "a";
    runUpdated(el, { automationId: undefined });
    await flush();
    el.mode = "yaml";

    el.automationId = null;
    runUpdated(el, { automationId: "a" });

    expect(el.mode).toBe("gui");
    expect(el.config?.triggers).toEqual([]);
  });

  test("does not reset on the first id assignment of a fresh element", async () => {
    const el = createEditor();
    el.yamlErrors = "sentinel";
    el.automationId = "a";
    runUpdated(el, { automationId: undefined });

    expect(el.yamlErrors).toBe("sentinel");
    await flush();
    expect(el.config?.alias).toBe("a");
  });

  test("ignores a config fetch that resolves after switching items", async () => {
    const el = createEditor();
    let resolveA!: (value: AutomationConfig) => void;
    (el.hass.callApi as any).mockImplementation(
      (_method: string, path: string) => {
        const id = path.split("/").pop();
        if (id === "a") {
          return new Promise((resolve) => {
            resolveA = resolve;
          });
        }
        return Promise.resolve(configFor(id!));
      }
    );
    el.automationId = "a";
    runUpdated(el, { automationId: undefined });

    el.automationId = "b";
    runUpdated(el, { automationId: "a" });
    await flush();
    expect(el.config?.alias).toBe("b");

    resolveA(configFor("a"));
    await flush();
    expect(el.config?.alias).toBe("b");
  });

  test("switching to another entity in the read-only view resets the editor state", async () => {
    const el = createEditor();
    el.entityId = "automation.one";
    runUpdated(el, { entityId: undefined });
    await flush();
    el.mode = "yaml";

    el.entityId = "automation.two";
    runUpdated(el, { entityId: "automation.one" });

    expect(el.mode).toBe("gui");
    expect(el.readOnly).toBe(true);
    await flush();
    expect(el.config?.alias).toBe("state");
  });
});
