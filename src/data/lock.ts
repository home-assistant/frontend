import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { getExtendedEntityRegistryEntry } from "./entity_registry";
import { showEnterCodeDialog } from "../dialogs/enter-code/show-enter-code-dialog";
import { HomeAssistant } from "../types";
import { UNAVAILABLE } from "./entity";

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

export function isLocked(stateObj: LockEntity) {
  return stateObj.state === "locked";
}

export function isUnlocked(stateObj: LockEntity) {
  return stateObj.state === "unlocked";
}

export function isUnlocking(stateObj: LockEntity) {
  return stateObj.state === "unlocking";
}

export function isLocking(stateObj: LockEntity) {
  return stateObj.state === "locking";
}

export function isJammed(stateObj: LockEntity) {
  return stateObj.state === "jammed";
}

export function isOpen(stateObj: LockEntity) {
  return stateObj.state === "open";
}

export function isOpening(stateObj: LockEntity) {
  return stateObj.state === "opening";
}

export function isWaiting(stateObj: LockEntity) {
  return ["opening", "unlocking", "locking"].includes(stateObj.state);
}

export function canOpen(stateObj: LockEntity) {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isOpen(stateObj) && !isWaiting(stateObj));
}

export function canLock(stateObj: LockEntity) {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isLocked(stateObj) && !isWaiting(stateObj));
}

export function canUnlock(stateObj: LockEntity) {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  const assumedState = stateObj.attributes.assumed_state === true;
  return assumedState || (!isUnlocked(stateObj) && !isWaiting(stateObj));
}

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
