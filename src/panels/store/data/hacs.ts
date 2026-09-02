import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { RepositoryBase, RepositoryType } from "./repository";

declare global {
  interface HASSDomEvents {
    "store-refresh": { target: "info" | "repositories" };
  }

  interface GlobalEventHandlersEventMap {
    "store-refresh": HASSDomEvent<HASSDomEvents["store-refresh"]>;
  }
}

export const APP_FULL_NAME = "Home Assistant Community Store";

export interface HacsInfo {
  categories: RepositoryType[];
  country: string;
  debug: boolean;
  disabled_reason: string;
  lovelace_mode: "yaml" | "storage";
  stage: "startup" | "waiting" | "running" | "setup";
  startup: boolean;
  version: string;
}

export interface Hacs {
  repositories: RepositoryBase[];
  info: HacsInfo;
}
