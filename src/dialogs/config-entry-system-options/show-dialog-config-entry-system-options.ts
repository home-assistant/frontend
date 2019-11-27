import { fireEvent } from "../../common/dom/fire_event";
import { ConfigEntry } from "../../data/config_entries";

export interface ConfigEntrySystemOptionsDialogParams {
  entry: ConfigEntry;
  // updateEntry: (
  //   updates: Partial<EntityRegistryEntryUpdateParams>
  // ) => Promise<unknown>;
  // removeEntry: () => Promise<boolean>;
}

export const loadConfigEntrySystemOptionsDialog = () =>
  import(
    /* webpackChunkName: "config-entry-system-options" */ "./dialog-config-entry-system-options"
  );

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
