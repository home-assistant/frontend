import { describe, expect, test, vi } from "vitest";

import "../../../../src/panels/config/script/ha-script-editor";
import type { HaScriptEditor } from "../../../../src/panels/config/script/ha-script-editor";
import type { ScriptConfig } from "../../../../src/data/script";
import { createMockHass } from "../../../fixtures/hass";
import { flush, runUpdated } from "../../../fixtures/lit";

const configFor = (alias: string): ScriptConfig => ({
  alias,
  sequence: [],
});

const createEditor = (): any => {
  const el = document.createElement("ha-script-editor") as HaScriptEditor;
  const hass = createMockHass();
  (hass as any).callApi = vi.fn(async (_method: string, path: string) =>
    configFor(path.split("/").pop()!)
  );
  (hass as any).callWS = vi.fn(async () => ({ config: configFor("state") }));
  el.hass = hass;
  return el;
};

describe("script editor item switch", () => {
  test("switching to another script resets the editor state", async () => {
    const el = createEditor();
    el.scriptId = "a";
    runUpdated(el, { scriptId: undefined });
    await flush();
    expect(el.config?.alias).toBe("a");

    el.mode = "yaml";
    el.yamlErrors = "unparseable";
    el._undoRedoController.commit(configFor("a-edited"));
    expect(el._undoRedoController.canUndo).toBe(true);

    el.scriptId = "b";
    runUpdated(el, { scriptId: "a" });

    expect(el.mode).toBe("gui");
    expect(el.yamlErrors).toBeUndefined();
    expect(el._undoRedoController.canUndo).toBe(false);
    await flush();
    expect(el.config?.alias).toBe("b");
  });

  test("keeps state when the id change comes from saving a new script", async () => {
    const el = createEditor();
    el.scriptId = null;
    runUpdated(el, { scriptId: undefined });
    expect(el.config).toBeDefined();

    el.mode = "yaml";
    el.justSavedId = "123";
    el.scriptId = "123";
    runUpdated(el, { scriptId: null });

    expect(el.mode).toBe("yaml");
    expect(el.justSavedId).toBeUndefined();
    await flush();
    expect(el.config?.alias).toBe("123");
  });

  test("switching to another entity in the read-only view resets the editor state", async () => {
    const el = createEditor();
    el.entityRegistry = [
      { entity_id: "script.one", unique_id: "one", platform: "script" },
      { entity_id: "script.two", unique_id: "two", platform: "script" },
    ];
    el.entityId = "script.one";
    runUpdated(el, { entityId: undefined });
    expect(el.scriptId).toBe("one");
    await flush();

    // the show route assigns scriptId internally; that must not reset
    el.yamlErrors = "sentinel";
    runUpdated(el, { scriptId: null });
    expect(el.yamlErrors).toBe("sentinel");

    el.mode = "yaml";
    el.entityId = "script.two";
    runUpdated(el, { entityId: "script.one" });

    expect(el.mode).toBe("gui");
    expect(el.readOnly).toBe(true);
    expect(el.scriptId).toBe("two");
    await flush();
    expect(el.config?.alias).toBe("state");
  });
});
