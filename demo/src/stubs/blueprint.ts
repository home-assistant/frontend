import type { BlueprintDomain, Blueprints } from "../../../src/data/blueprint";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const automationBlueprints: Blueprints = {
  "homeassistant/motion_light.yaml": {
    metadata: {
      domain: "automation",
      name: "Motion-activated Light",
      description: "Turn on a light when motion is detected.",
      author: "Home Assistant",
      source_url:
        "https://github.com/home-assistant/core/blob/dev/homeassistant/components/automation/blueprints/motion_light.yaml",
      input: {
        motion_entity: { name: "Motion Sensor" },
        light_target: { name: "Light" },
      },
    },
  },
  "homeassistant/notify_leaving_zone.yaml": {
    metadata: {
      domain: "automation",
      name: "Send notification when leaving a zone",
      description: "Get a notification when a person leaves a zone.",
      author: "Home Assistant",
    },
  },
};

const scriptBlueprints: Blueprints = {
  "homeassistant/confirmable_notification.yaml": {
    metadata: {
      domain: "script",
      name: "Confirmable Notification",
      description:
        "A script that sends an actionable notification with a confirmation.",
      author: "Home Assistant",
    },
  },
};

export const mockBlueprint = (hass: MockHomeAssistant) => {
  hass.mockWS("blueprint/list", (msg: { domain: BlueprintDomain }) =>
    msg.domain === "script" ? scriptBlueprints : automationBlueprints
  );
};
