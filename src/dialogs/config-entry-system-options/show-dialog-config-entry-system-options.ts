import type { ConfigEntry } from "../../data/config_entries";
import type { IntegrationManifest } from "../../data/integration";

import { fireEvent } from "../../common/dom/fire_event";

export interface ConfigEntrySystemOptionsDialogParams {
  entry: ConfigEntry;
  manifest?: IntegrationManifest;
}

export const loadConfigEntrySystemOptionsDialog = () =>
  import("./dialog-config-entry-system-options");

export const showConfigEntrySystemOptionsDialog = (
  element: HTMLElement,
  systemLogDetailParams: ConfigEntrySystemOptionsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-config-entry-system-options",
    dialogImport: loadConfigEntrySystemOptionsDialog,
    dialogParams: systemLogDetailParams,
  });
};
