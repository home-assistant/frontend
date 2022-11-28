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
    case "arming":
    case "disarming":
      return "alarm-arming";
    case "triggered":
      return "alarm-triggered";
    default:
      return undefined;
  }
};
