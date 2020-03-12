/**
 * Return the icon to be used for a domain.
 *
 * Optionally pass in a state to influence the domain icon.
 */
import { DEFAULT_DOMAIN_ICON } from "../const";

const fixedIcons = {
  alert: "hass:alert",
  alexa: "hass:amazon-alexa",
  automation: "hass:robot",
  calendar: "hass:calendar",
  camera: "hass:video",
  climate: "hass:thermostat",
  configurator: "hass:settings",
  conversation: "hass:text-to-speech",
  counter: "hass:counter",
  device_tracker: "hass:account",
  fan: "hass:fan",
  google_assistant: "hass:google-assistant",
  group: "hass:google-circles-communities",
  history_graph: "hass:chart-line",
  homeassistant: "hass:home-assistant",
  homekit: "hass:home-automation",
  image_processing: "hass:image-filter-frames",
  input_boolean: "hass:toggle-switch-outline",
  input_datetime: "hass:calendar-clock",
  input_number: "hass:ray-vertex",
  input_select: "hass:format-list-bulleted",
  input_text: "hass:textbox",
  light: "hass:lightbulb",
  mailbox: "hass:mailbox",
  notify: "hass:comment-alert",
  persistent_notification: "hass:bell",
  person: "hass:account",
  plant: "hass:flower",
  proximity: "hass:apple-safari",
  remote: "hass:remote",
  scene: "hass:palette",
  script: "hass:script-text",
  sensor: "hass:eye",
  simple_alarm: "hass:bell",
  sun: "hass:white-balance-sunny",
  switch: "hass:flash",
  timer: "hass:timer",
  updater: "hass:cloud-upload",
  vacuum: "hass:robot-vacuum",
  water_heater: "hass:thermometer",
  weather: "hass:weather-cloudy",
  weblink: "hass:open-in-new",
  zone: "hass:map-marker-radius",
};

export const domainIcon = (domain: string, state?: string): string => {
  if (domain in fixedIcons) {
    return fixedIcons[domain];
  }

  switch (domain) {
    case "alarm_control_panel":
      switch (state) {
        case "armed_home":
          return "hass:bell-plus";
        case "armed_night":
          return "hass:bell-sleep";
        case "disarmed":
          return "hass:bell-outline";
        case "triggered":
          return "hass:bell-ring";
        default:
          return "hass:bell";
      }

    case "binary_sensor":
      return state && state === "off"
        ? "hass:radiobox-blank"
        : "hass:checkbox-marked-circle";

    case "cover":
      return state === "closed" ? "hass:window-closed" : "hass:window-open";

    case "lock":
      return state && state === "unlocked" ? "hass:lock-open" : "hass:lock";

    case "media_player":
      return state && state === "playing" ? "hass:cast-connected" : "hass:cast";

    case "zwave":
      switch (state) {
        case "dead":
          return "hass:emoticon-dead";
        case "sleeping":
          return "hass:sleep";
        case "initializing":
          return "hass:timer-sand";
        default:
          return "hass:z-wave";
      }

    default:
      // tslint:disable-next-line
      console.warn(
        "Unable to find icon for domain " + domain + " (" + state + ")"
      );
      return DEFAULT_DOMAIN_ICON;
  }
};
