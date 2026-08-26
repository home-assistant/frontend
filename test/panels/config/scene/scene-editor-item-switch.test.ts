import { describe, expect, test, vi } from "vitest";

import "../../../../src/panels/config/scene/ha-scene-editor";
import type { HaSceneEditor } from "../../../../src/panels/config/scene/ha-scene-editor";
import type { SceneConfig } from "../../../../src/data/scene";
import { showSceneEditor } from "../../../../src/data/scene";
import { createMockHass } from "../../../fixtures/hass";
import { flush, runUpdated } from "../../../fixtures/lit";

const createEditor = (): any => {
  const el = document.createElement("ha-scene-editor") as HaSceneEditor;
  const hass = createMockHass();
  (hass as any).callApi = vi.fn(async (_method: string, path: string) => ({
    name: `${path.split("/").pop()} name`,
    entities: {},
  }));
  (hass as any).callService = vi.fn(async () => ({}));
  (hass as any).connection = { subscribeEvents: vi.fn(async () => vi.fn()) };
  el.hass = hass;
  el.scenes = [];
  return el;
};

describe("scene editor item switch", () => {
  test("switching to another scene resets the editor state", async () => {
    const el = createEditor();
    el.sceneId = "scene_a";
    runUpdated(el, { sceneId: undefined });
    await flush();
    expect(el._config?.name).toBe("scene_a name");

    el._mode = "yaml";
    el._yamlErrors = "unparseable";

    el.sceneId = "scene_b";
    runUpdated(el, { sceneId: "scene_a" });

    expect(el._mode).toBe("review");
    expect(el._yamlErrors).toBeUndefined();
    await flush();
    expect(el._config?.name).toBe("scene_b name");
  });

  test("leaving live mode restores stored states and unsubscribes", async () => {
    const el = createEditor();
    el.sceneId = "scene_a";
    runUpdated(el, { sceneId: undefined });
    await flush();

    const unsubscribe = vi.fn();
    const storedStates = { "light.kitchen": "on" };
    el._mode = "live";
    el._storedStates = storedStates;
    el._unsubscribeEvents = unsubscribe;

    el.sceneId = "scene_b";
    runUpdated(el, { sceneId: "scene_a" });

    expect(el.hass.callService).toHaveBeenCalledWith("scene", "apply", {
      entities: storedStates,
    });
    expect(unsubscribe).toHaveBeenCalled();
    expect(el._unsubscribeEvents).toBeUndefined();
    expect(el._mode).toBe("review");
  });

  test("duplicating a scene opens the copy in review mode", async () => {
    const el = createEditor();
    el.sceneId = "scene_a";
    runUpdated(el, { sceneId: undefined });
    await flush();
    el._mode = "yaml";

    showSceneEditor({ name: "scene_a name (Duplicate)", entities: {} });
    el.sceneId = null;
    runUpdated(el, { sceneId: "scene_a" });

    expect(el._mode).toBe("review");
    expect(el._config?.name).toBe("scene_a name (Duplicate)");
    expect(el.hass.connection.subscribeEvents).not.toHaveBeenCalled();
    expect(el.isDirtyState).toBe(true);
  });

  test("ignores a scene fetch that resolves after switching scenes", async () => {
    const el = createEditor();
    let resolveA!: (value: SceneConfig) => void;
    (el.hass.callApi as any).mockImplementation(
      (_method: string, path: string) => {
        if (path.endsWith("/scene_a")) {
          return new Promise((resolve) => {
            resolveA = resolve;
          });
        }
        return Promise.resolve({
          name: `${path.split("/").pop()} name`,
          entities: {},
        });
      }
    );
    el.sceneId = "scene_a";
    runUpdated(el, { sceneId: undefined });

    el.sceneId = "scene_b";
    runUpdated(el, { sceneId: "scene_a" });
    await flush();
    expect(el._config?.name).toBe("scene_b name");

    resolveA({ name: "scene_a name", entities: {} });
    await flush();
    expect(el._config?.name).toBe("scene_b name");
  });

  test("discards a live subscription that resolves after switching scenes", async () => {
    const el = createEditor();
    el.sceneId = "scene_a";
    runUpdated(el, { sceneId: undefined });
    await flush();

    let resolveSubscribe!: (value: () => void) => void;
    el.hass.connection.subscribeEvents = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubscribe = resolve;
        })
    );
    el._mode = "live";
    el._subscribeEvents();

    el.sceneId = "scene_b";
    runUpdated(el, { sceneId: "scene_a" });

    const unsubscribe = vi.fn();
    resolveSubscribe(unsubscribe);
    await flush();
    expect(unsubscribe).toHaveBeenCalled();
    expect(el._unsubscribeEvents).toBeUndefined();
  });

  test("keeps state when the id change comes from saving a new scene", async () => {
    const el = createEditor();
    el.sceneId = null;
    runUpdated(el, { sceneId: undefined });
    expect(el._config).toBeDefined();

    el._mode = "yaml";
    el._justSavedId = "123";
    el.sceneId = "123";
    runUpdated(el, { sceneId: null });

    expect(el._mode).toBe("yaml");
    expect(el._justSavedId).toBeUndefined();
    await flush();
    expect(el._config?.name).toBe("123 name");
  });
});
