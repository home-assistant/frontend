import { fireEvent } from "../../../../common/dom/fire_event";
import { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import { LightColor } from "../../../../data/light";

export interface LightColorFavoriteDialogParams {
  entry: ExtEntityRegistryEntry;
  title: string;
  initialColor?: LightColor;
  submit?: (color?: LightColor) => void;
  cancel?: () => void;
}

export const loadLightColorFavoriteDialog = () =>
  import("./dialog-light-color-favorite");

export const showLightColorFavoriteDialog = (
  element: HTMLElement,
  dialogParams: LightColorFavoriteDialogParams
) =>
  new Promise<LightColor | null>((resolve) => {
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
        submit: (color: LightColor) => {
          resolve(color);
          if (origSubmit) {
            origSubmit(color);
          }
        },
      },
    });
  });
