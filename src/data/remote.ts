import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export enum RemoteEntityFeature {
  LEARN_COMMAND = 1,
  DELETE_COMMAND = 2,
  ACTIVITY = 4,
}

export type RemoteEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    current_activity: string | null;
    activity_list: string[] | null;
    [key: string]: any;
  };
};
