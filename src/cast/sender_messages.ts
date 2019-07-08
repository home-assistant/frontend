import { BaseCastMessage } from "./types";

// Messages to be processed inside the Home Assistant UI

export interface ReceiverStatusMessage extends BaseCastMessage {
  type: "receiver_status";
  connected: boolean;
  hassUrl?: string;
  lovelacePath?: string;
}

export type SenderMessage = ReceiverStatusMessage;
