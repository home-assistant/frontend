import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const REMOTE_SUPPORT_LEARN_COMMAND = 1;
export const REMOTE_SUPPORT_DELETE_COMMAND = 2;
export const REMOTE_SUPPORT_ACTIVITY = 4;

export type RemoteEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    current_activity: string | null;
    activity_list: string[] | null;
    [key: string]: any;
  };
};
