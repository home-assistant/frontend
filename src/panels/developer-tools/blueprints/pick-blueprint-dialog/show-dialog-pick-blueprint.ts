import { fireEvent } from "../../../../common/dom/fire_event";
import type { BlueprintDomain, Blueprints } from "../../../../data/blueprint";

export const loadPickBlueprintDialog = () => import("./dialog-pick-blueprint");

export interface PickBlueprintDialogParams {
  blueprints: Record<BlueprintDomain, Blueprints>;
  handlePickBlueprint: (domain: BlueprintDomain, id: string) => void;
  handlePickNewBlueprint: (domain: BlueprintDomain) => void;
}

export const showPickBlueprintDialog = (
  element: HTMLElement,
  dialogParams: PickBlueprintDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-pick-blueprint",
    dialogImport: loadPickBlueprintDialog,
    dialogParams,
  });
};
