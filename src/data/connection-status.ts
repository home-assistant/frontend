/**
 * Broadcast connection status updates
 */

import type { HASSDomEvent } from "../common/dom/fire_event";
import { fireEvent } from "../common/dom/fire_event";

export type ConnectionStatus = "connected" | "auth-invalid" | "disconnected";

export interface ConnectionStatusDetail {
  status: ConnectionStatus;
  haVersion?: string;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "connection-status": ConnectionStatusDetail;
  }

  interface GlobalEventHandlersEventMap {
    "connection-status": HASSDomEvent<HASSDomEvents["connection-status"]>;
  }
}

export const broadcastConnectionStatus = (
  status: ConnectionStatus,
  haVersion?: string
) => {
  fireEvent(window, "connection-status", { status, haVersion });
};
