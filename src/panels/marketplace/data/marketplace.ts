import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { RepositoryBase, RepositoryType } from "./repository";

declare global {
  interface HASSDomEvents {
    // Fired when the repository list changed and has to be refetched.
    "marketplace-refresh": undefined;
  }

  interface GlobalEventHandlersEventMap {
    "marketplace-refresh": HASSDomEvent<HASSDomEvents["marketplace-refresh"]>;
  }
}

export interface MarketplaceInfo {
  categories: RepositoryType[];
  country: string;
  debug: boolean;
  disabled_reason: string | null;
  lovelace_mode: "yaml" | "storage";
  stage: "startup" | "waiting" | "running" | "setup";
  startup: boolean;
  version: string;
}

export interface MarketplaceData {
  repositories: RepositoryBase[];
  info: MarketplaceInfo;
}
