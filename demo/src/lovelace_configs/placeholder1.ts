import { DemoLovelaceConfig } from "./types";

export const placeholder1Config: DemoLovelaceConfig = {
  demoConfigName: "Basic",
  demoAuthorName: "Paulus Schoutsen",
  demoAuthorUrl: "https://www.twitter.com/balloob",
  title: "Home",
  views: [
    {
      path: "default_view",
      title: "Home",
      badges: ["device_tracker.demo_paulus"],
      cards: [
        { type: "custom:ha-demo-card" },
        {
          type: "entities",
          entities: ["light.bed_light"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        { type: "thermostat", entity: "climate.ecobee" },
        {
          type: "entities",
          entities: ["cover.kitchen_window"],
          title: "Cover",
        },
        {
          type: "entities",
          entities: ["input_number.noise_allowance"],
          title: "Input number",
        },
        { type: "entities", entities: ["lock.kitchen_door"], title: "Lock" },
        {
          type: "entities",
          entities: ["scene.romantic_lights"],
          title: "Scene",
        },
      ],
    },
  ],
};
