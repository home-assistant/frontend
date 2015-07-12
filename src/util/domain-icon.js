export default function domainIcon(domain, state) {
  switch(domain) {
    case "homeassistant":
      return "home";

    case "group":
      return "homeassistant-24:group";

    case "device_tracker":
      return "social:person";

    case "switch":
      return "image:flash-on";

    case "media_player":
      var icon = "hardware:cast";

      if (state && state !== "off" && state !== 'idle') {
        icon += "-connected";
      }

      return icon;

    case "sun":
      return "image:wb-sunny";

    case "light":
      return "image:wb-incandescent";

    case "simple_alarm":
      return "social:notifications";

    case "notify":
      return "announcement";

    case "thermostat":
      return "homeassistant-100:thermostat";

    case "sensor":
      return "visibility";

    case "configurator":
      return "settings";

    case "conversation":
      return "av:hearing";

    case "script":
      return "description";

    case 'scene':
      return 'social:pages';

    default:
      return "bookmark";
  }
};
