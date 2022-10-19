export const alarmControlPanelColor = (state?: string): string | undefined => {
  switch (state) {
    case "armed_away":
    case "armed_vacation":
    case "armed_home":
    case "armed_night":
    case "armed_custom_bypass":
      return "alarm-armed";
    case "pending":
      return "alarm-pending";
    case "triggered":
      return "alarm-triggered";
    case "disarmed":
      return "alarm-disarmed";
    default:
      return undefined;
  }
};
