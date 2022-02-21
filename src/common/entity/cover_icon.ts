/** Return an icon representing a cover state. */
import {
  mdiArrowUpBox,
  mdiArrowDownBox,
  mdiGarage,
  mdiGarageOpen,
  mdiGateArrowRight,
  mdiGate,
  mdiGateOpen,
  mdiDoorOpen,
  mdiDoorClosed,
  mdiCircle,
  mdiWindowShutter,
  mdiWindowShutterOpen,
  mdiBlinds,
  mdiBlindsOpen,
  mdiWindowClosed,
  mdiWindowOpen,
  mdiArrowExpandHorizontal,
  mdiArrowUp,
  mdiArrowCollapseHorizontal,
  mdiArrowDown,
  mdiCircleSlice8,
  mdiArrowSplitVertical,
  mdiCurtains,
  mdiCurtainsClosed,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";

export const coverIcon = (state?: string, stateObj?: HassEntity): string => {
  const open = state !== "closed";

  switch (stateObj?.attributes.device_class) {
    case "garage":
      switch (state) {
        case "opening":
          return mdiArrowUpBox;
        case "closing":
          return mdiArrowDownBox;
        case "closed":
          return mdiGarage;
        default:
          return mdiGarageOpen;
      }
    case "gate":
      switch (state) {
        case "opening":
        case "closing":
          return mdiGateArrowRight;
        case "closed":
          return mdiGate;
        default:
          return mdiGateOpen;
      }
    case "door":
      return open ? mdiDoorOpen : mdiDoorClosed;
    case "damper":
      return open ? mdiCircle : mdiCircleSlice8;
    case "shutter":
      switch (state) {
        case "opening":
          return mdiArrowUpBox;
        case "closing":
          return mdiArrowDownBox;
        case "closed":
          return mdiWindowShutter;
        default:
          return mdiWindowShutterOpen;
      }
    case "curtain":
      switch (state) {
        case "opening":
          return mdiArrowSplitVertical;
        case "closing":
          return mdiArrowCollapseHorizontal;
        case "closed":
          return mdiCurtainsClosed;
        default:
          return mdiCurtains;
      }
    case "blind":
    case "shade":
      switch (state) {
        case "opening":
          return mdiArrowUpBox;
        case "closing":
          return mdiArrowDownBox;
        case "closed":
          return mdiBlinds;
        default:
          return mdiBlindsOpen;
      }
    case "window":
      switch (state) {
        case "opening":
          return mdiArrowUpBox;
        case "closing":
          return mdiArrowDownBox;
        case "closed":
          return mdiWindowClosed;
        default:
          return mdiWindowOpen;
      }
  }

  switch (state) {
    case "opening":
      return mdiArrowUpBox;
    case "closing":
      return mdiArrowDownBox;
    case "closed":
      return mdiWindowClosed;
    default:
      return mdiWindowOpen;
  }
};

export const computeOpenIcon = (stateObj: HassEntity): string => {
  switch (stateObj.attributes.device_class) {
    case "awning":
    case "door":
    case "gate":
      return mdiArrowExpandHorizontal;
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
      return mdiArrowCollapseHorizontal;
    case "curtain":
      return mdiArrowCollapseHorizontal;
    default:
      return mdiArrowDown;
  }
};
