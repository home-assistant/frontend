import { fireEvent } from "../../../common/dom/fire_event";
import type { ConfigEntry } from "../../../data/config_entries";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";

export interface ConfigEntryHealthDialogParams {
  entry: ConfigEntry;
  entities: EntityRegistryEntry[];
  manifest?: IntegrationManifest;
}

export const showConfigEntryHealthDialog = (
  element: HTMLElement,
  dialogParams: ConfigEntryHealthDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-config-entry-health",
    dialogImport: () => import("./dialog-config-entry-health"),
    dialogParams,
  });
};
