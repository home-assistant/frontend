import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { getCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";

export interface SystemState {
  home_assistant_restart_dismissed: boolean;
  home_assistant_restart_required: boolean;
  home_assistant_restart_sources: string[];
  host_reboot_dismissed: boolean;
  host_reboot_required: boolean;
}

const subscribeSystemStateUpdates = (
  conn: Connection,
  store: Store<SystemState>
) =>
  conn.subscribeMessage<SystemState>(
    (systemState) => store.setState(systemState, true),
    { type: "subscribe_system_state" }
  );

// The subscription sends the current state right away, so there is
// nothing to fetch first. Shared, so the sidebar and the restart bar use
// one subscription.
export const subscribeSystemState = (
  conn: Connection,
  onChange: (systemState: SystemState) => void
): UnsubscribeFunc =>
  getCollection<SystemState>(
    conn,
    "_systemState",
    undefined,
    subscribeSystemStateUpdates
  ).subscribe(onChange);

// Puts off what is pending right now, for every admin on every device,
// until something new asks.
export const dismissSystemState = (conn: Connection) =>
  conn.sendMessagePromise<null>({ type: "dismiss_system_state" });
