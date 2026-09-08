import "./strategies";
import type { DemoConfig } from "../types";

export const demoLovelaceHome: DemoConfig["lovelace"] = () => ({
  strategy: {
    type: "custom:demo-home",
    favorite_entities: ["lock.front_door", "switch.garden_sprinkler"],
  },
});
