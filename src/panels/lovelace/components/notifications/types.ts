import { HassEntity } from "home-assistant-js-websocket";

export declare type HassNotification = HassEntity & {
  notification_id?: string;
  created_at?: string;
  title?: string;
  message?: string;
};
