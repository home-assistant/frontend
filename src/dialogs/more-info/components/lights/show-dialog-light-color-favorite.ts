import { fireEvent } from "../../../../common/dom/fire_event";
import { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import { FavoriteColor } from "../../../../data/light";

export interface LightColorFavoriteDialogParams {
  entry: ExtEntityRegistryEntry;
  submit?: (color?: FavoriteColor) => void;
  cancel?: () => void;
}

export const loadLightColorFavoriteDialog = () =>
  import("./dialog-light-color-favorite");

export const showLightColorFavoriteDialog = (
  element: HTMLElement,
  dialogParams: LightColorFavoriteDialogParams
) =>
  new Promise<FavoriteColor | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-light-color-favorite",
      dialogImport: loadLightColorFavoriteDialog,
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (color: FavoriteColor) => {
          resolve(color);
          if (origSubmit) {
            origSubmit(color);
          }
        },
      },
    });
  });
