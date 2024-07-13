import {
  Connection,
  getCollection,
  HassEventBase,
} from "home-assistant-js-websocket";
import type { HuiCard } from "../panels/lovelace/cards/hui-card";
import type { HuiSection } from "../panels/lovelace/sections/hui-section";
import { Lovelace, LovelaceBadge } from "../panels/lovelace/types";
import { HomeAssistant } from "../types";
import { LovelaceSectionConfig } from "./lovelace/config/section";
import { fetchConfig, LegacyLovelaceConfig } from "./lovelace/config/types";
import { LovelaceViewConfig } from "./lovelace/config/view";

export interface LovelacePanelConfig {
  mode: "yaml" | "storage";
}

export interface LovelaceViewElement extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: Lovelace;
  narrow?: boolean;
  index?: number;
  cards?: HuiCard[];
  badges?: LovelaceBadge[];
  sections?: HuiSection[];
  isStrategy: boolean;
  setConfig(config: LovelaceViewConfig): void;
}

export interface LovelaceSectionElement extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: Lovelace;
  preview?: boolean;
  viewIndex?: number;
  index?: number;
  cards?: HuiCard[];
  isStrategy: boolean;
  setConfig(config: LovelaceSectionConfig): void;
}

type LovelaceUpdatedEvent = HassEventBase & {
  event_type: "lovelace_updated";
  data: {
    url_path: string | null;
    mode: "yaml" | "storage";
  };
};

export const subscribeLovelaceUpdates = (
  conn: Connection,
  urlPath: string | null,
  onChange: () => void
) =>
  conn.subscribeEvents<LovelaceUpdatedEvent>((ev) => {
    if (ev.data.url_path === urlPath) {
      onChange();
    }
  }, "lovelace_updated");

export const getLovelaceCollection = (
  conn: Connection,
  urlPath: string | null = null
) =>
  getCollection(
    conn,
    `_lovelace_${urlPath ?? ""}`,
    (conn2) => fetchConfig(conn2, urlPath, false),
    (_conn, store) =>
      subscribeLovelaceUpdates(conn, urlPath, () =>
        fetchConfig(conn, urlPath, false).then((config) =>
          store.setState(config, true)
        )
      )
  );

// Legacy functions to support cast for Home Assistion < 0.107
const fetchLegacyConfig = (
  conn: Connection,
  force: boolean
): Promise<LegacyLovelaceConfig> =>
  conn.sendMessagePromise({
    type: "lovelace/config",
    force,
  });

const subscribeLegacyLovelaceUpdates = (
  conn: Connection,
  onChange: () => void
) => conn.subscribeEvents(onChange, "lovelace_updated");

export const getLegacyLovelaceCollection = (conn: Connection) =>
  getCollection(
    conn,
    "_lovelace",
    (conn2) => fetchLegacyConfig(conn2, false),
    (_conn, store) =>
      subscribeLegacyLovelaceUpdates(conn, () =>
        fetchLegacyConfig(conn, false).then((config) =>
          store.setState(config, true)
        )
      )
  );
