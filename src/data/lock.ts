import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { showEnterCodeDialogDialog } from "../dialogs/enter-code/show-enter-code-dialog";
import { HomeAssistant } from "../types";

export const FORMAT_TEXT = "text";
export const FORMAT_NUMBER = "number";

export const enum LockEntityFeature {
  OPEN = 1,
}

interface LockEntityAttributes extends HassEntityAttributeBase {
  code_format?: string;
  changed_by?: string | null;
}

export interface LockEntity extends HassEntityBase {
  attributes: LockEntityAttributes;
}

type ProtectedLockService = "lock" | "unlock" | "open";

export const callProtectedLockService = async (
  element: HTMLElement,
  hass: HomeAssistant,
  stateObj: LockEntity,
  service: ProtectedLockService
) => {
  let code: string | undefined;

  if (stateObj!.attributes.code_format) {
    const response = await showEnterCodeDialogDialog(element, {
      codeFormat: "text",
      codePattern: stateObj!.attributes.code_format,
      title: hass.localize(`ui.dialogs.more_info_control.lock.${service}`),
      submitText: hass.localize(`ui.dialogs.more_info_control.lock.${service}`),
    });
    if (!response) {
      throw new Error("Code dialog closed");
    }
    code = response;
  }

  await hass.callService("lock", service, {
    entity_id: stateObj!.entity_id,
    code,
  });
};
