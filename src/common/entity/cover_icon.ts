/** Return an icon representing a cover state. */
import {
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";

export const computeOpenIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
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
    case "awning":
    case "door":
    case "gate":
    case "curtain":
      return mdiArrowCollapseHorizontal;
    default:
      return mdiArrowDown;
  }
};
