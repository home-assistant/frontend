import { HassEntity } from "home-assistant-js-websocket";

export const personColor = (stateObj: HassEntity): string | undefined => {
  switch (stateObj.state) {
    case "home":
      return "person-home";
    default:
      return "person-zone";
  }
};
