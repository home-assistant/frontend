/** Return an icon representing a alarm panel state. */

import {
  mdiShieldLock,
  mdiShieldAirplane,
  mdiShieldHome,
  mdiShieldMoon,
  mdiSecurity,
  mdiShieldOutline,
  mdiBellRing,
  mdiShieldOff,
  mdiShield,
} from "@mdi/js";

export const alarmPanelIcon = (state?: string) => {
  switch (state) {
    case "armed_away":
      return mdiShieldLock;
    case "armed_vacation":
      return mdiShieldAirplane;
    case "armed_home":
      return mdiShieldHome;
    case "armed_night":
      return mdiShieldMoon;
    case "armed_custom_bypass":
      return mdiSecurity;
    case "pending":
      return mdiShieldOutline;
    case "triggered":
      return mdiBellRing;
    case "disarmed":
      return mdiShieldOff;
    default:
      return mdiShield;
  }
};
