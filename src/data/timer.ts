import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

export type TimerEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    duration: string;
    remaining: string;
  };
};
