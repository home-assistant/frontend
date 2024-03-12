import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { getExtendedEntityRegistryEntry } from "./entity_registry";
import { showEnterCodeDialog } from "../dialogs/enter-code/show-enter-code-dialog";
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
  const lockRegistryEntry = await getExtendedEntityRegistryEntry(
    hass,
    stateObj.entity_id
  ).catch(() => undefined);
  const defaultCode = lockRegistryEntry?.options?.lock?.default_code;

  if (stateObj!.attributes.code_format && !defaultCode) {
    const response = await showEnterCodeDialog(element, {
      codeFormat: "text",
      codePattern: stateObj!.attributes.code_format,
      title: hass.localize(`ui.card.lock.${service}`),
      submitText: hass.localize(`ui.card.lock.${service}`),
    });
    if (response == null) {
      throw new Error("Code dialog closed");
    }
    code = response;
  }

  await hass.callService("lock", service, {
    entity_id: stateObj!.entity_id,
    code,
  });
};
