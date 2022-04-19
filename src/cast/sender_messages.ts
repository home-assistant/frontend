import { BaseCastMessage } from "./types";

// Messages to be processed inside the Home Assistant UI

export interface ReceiverStatusMessage extends BaseCastMessage {
  type: "receiver_status";
  connected: boolean;
  showDemo: boolean;
  hassUrl?: string;
  hassUUID?: string;
  lovelacePath?: string | number | null;
  urlPath?: string | null;
}

export interface ReceiverErrorMessage extends BaseCastMessage {
  type: "receiver_error";
  error_code: ReceiverErrorCode;
  error_message: string;
}

export const enum ReceiverErrorCode {
  CONNECTION_FAILED = 1,
  AUTHENTICATION_FAILED = 2,
  CONNECTION_LOST = 3,
  HASS_URL_MISSING = 4,
  NO_HTTPS = 5,
  WRONG_INSTANCE = 20,
  NOT_CONNECTED = 21,
  FETCH_CONFIG_FAILED = 22,
}

export type SenderMessage = ReceiverStatusMessage;
