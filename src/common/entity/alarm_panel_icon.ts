/** Return an icon representing a alarm panel state. */

export const alarmPanelIcon = (state?: string) => {
  switch (state) {
    case "armed_away":
      return "hass:shield-lock";
    case "armed_vacation":
      return "hass:shield-airplane";
    case "armed_home":
      return "hass:shield-home";
    case "armed_night":
      return "hass:shield-moon";
    case "armed_custom_bypass":
      return "hass:security";
    case "pending":
      return "hass:shield-outline";
    case "triggered":
      return "hass:bell-ring";
    case "disarmed":
      return "hass:shield-off";
    default:
      return "hass:shield";
  }
};
