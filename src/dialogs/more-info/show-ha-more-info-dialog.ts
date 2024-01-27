import { fireEvent } from "../../common/dom/fire_event";
import type { MoreInfoDialogParams } from "./ha-more-info-dialog";

export const showMoreInfoDialog = (
  element: HTMLElement,
  params: MoreInfoDialogParams
) => fireEvent(element, "hass-more-info", params);
