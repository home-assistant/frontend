import { DemoLovelaceConfig } from "./types";

export const placeholder2Config: DemoLovelaceConfig = {
  demoConfigName: "Lite",
  demoAuthorName: "Bram Kragten",
  demoAuthorUrl: "https://www.twitter.com/balloob",
  title: "Tiny House",
  views: [
    {
      path: "default_view",
      title: "Home",
      badges: ["device_tracker.demo_paulus"],
      cards: [
        { type: "custom:ha-demo-card" },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
        {
          type: "glance",
          entities: ["light.bed_light", "cover.kitchen_window"],
          title: "Kitchen",
          show_header_toggle: true,
        },
      ],
    },
  ],
};
