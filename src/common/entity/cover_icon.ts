/** Return an icon representing a cover state. */
import {
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";

export const computeOpenIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "projector_screen":
      return mdiArrowDown; // "Open" means deploy (go down)
    case "awning":
    case "door":
    case "gate":
    case "curtain":
      return mdiArrowExpandHorizontal;
    default:
      return mdiArrowUp;
  }
};

export const computeCloseIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "projector_screen":
      return mdiArrowUp; // "Close" means retract (go up)
    case "awning":
    case "door":
    case "gate":
    case "curtain":
      return mdiArrowCollapseHorizontal;
    default:
      return mdiArrowDown;
  }
};
