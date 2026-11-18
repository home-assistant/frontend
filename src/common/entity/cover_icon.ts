/** Return an icon representing a cover state. */
import {
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
  mdiDoorClosed,
  mdiDoorOpen,
  mdiGate,
  mdiGateOpen,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";

export const computeOpenIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "door":
      return mdiDoorOpen;
    case "gate":
      return mdiGateOpen;
    case "curtain":
      return mdiArrowExpandHorizontal;
    case "awning":
      return mdiArrowDown;
    default:
      return mdiArrowUp;
  }
};

export const computeCloseIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "door":
      return mdiDoorClosed;
    case "gate":
      return mdiGate;
    case "curtain":
      return mdiArrowCollapseHorizontal;
    case "awning":
      return mdiArrowUp;
    default:
      return mdiArrowDown;
  }
};
