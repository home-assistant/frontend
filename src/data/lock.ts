import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../common/translations/localize";
import { showEnterCodeDialog } from "../dialogs/enter-code/show-enter-code-dialog";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE } from "./entity/entity";
import type { ExtEntityRegistryEntry } from "./entity/entity_registry";

export enum LockEntityFeature {
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
  callService: HomeAssistant["callService"],
  callWS: HomeAssistant["callWS"],
  localize: LocalizeFunc,
  stateObj: LockEntity,
  service: ProtectedLockService
) => {
  let code: string | undefined;
  const lockRegistryEntry = await callWS<ExtEntityRegistryEntry>({
    type: "config/entity_registry/get",
    entity_id: stateObj.entity_id,
  }).catch(() => undefined);
  const defaultCode = lockRegistryEntry?.options?.lock?.default_code;

  if (stateObj!.attributes.code_format && !defaultCode) {
    const response = await showEnterCodeDialog(element, {
      codeFormat: "text",
      codePattern: stateObj!.attributes.code_format,
      title: localize(`ui.card.lock.${service}`),
      submitText: localize(`ui.card.lock.${service}`),
    });
    if (response == null) {
      throw new Error("Code dialog closed");
    }
    code = response;
  }

  await callService("lock", service, {
    entity_id: stateObj!.entity_id,
    code,
  });
};
