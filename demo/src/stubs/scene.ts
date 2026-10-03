import type { SceneConfig } from "../../../src/data/scene";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const demoSceneConfig = (id: string): SceneConfig => ({
  id,
  name: "Demo scene",
  entities: {
    "light.bed_light": { state: "on" },
  },
});

export const mockScene = (hass: MockHomeAssistant) => {
  hass.mockAPI(/config\/scene\/config\/.+/, (_hass, method, path) => {
    const id = path.split("/").pop()!;
    // GET returns the config; POST/DELETE just acknowledge.
    return method === "GET" ? demoSceneConfig(id) : {};
  });
};
