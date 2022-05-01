import { HaDialog } from "../../components/ha-dialog";
import { HaButtonMenu } from "../../components/ha-button-menu";

export const deepActiveElement = <
  modeType extends "normal" | "dialog" | "check"
>(
  root: DocumentOrShadowRoot = document,
  mode?: modeType,
  checkElement?: Element | null
): modeType extends "check"
  ? boolean
  : modeType extends "dialog"
  ? [Element | null, HaDialog | null]
  : Element | null => {
  let activeElement = root.activeElement;
  let activeDialog: HaDialog | null = null;
  let deeperElement: Element | null | undefined;

  do {
    // Mode to check if a target is focused
    if (mode === "check" && checkElement === activeElement) return true as any;

    // Mode to determine closed dialog targets
    if (mode === "dialog") {
      // Detect when focus is slotted into certain components
      const slotRoot = activeElement?.assignedSlot?.getRootNode();
      if (slotRoot instanceof ShadowRoot) {
        const slotHost = slotRoot.host;
        if (slotHost instanceof HaButtonMenu) {
          // Use trigger button since popup menu will be hidden again
          activeElement = slotHost.querySelector('[slot="trigger"]');
          break;
        } else if (slotHost instanceof HaDialog) {
          // Focus is inside another dialog
          activeDialog = slotHost;
        }
      }
    }

    deeperElement = activeElement?.shadowRoot?.activeElement;
    activeElement = deeperElement ?? activeElement;
  } while (deeperElement);

  if (mode === "check") return false as any;
  if (mode === "dialog") return [activeElement, activeDialog] as any;
  return activeElement as any;
};
