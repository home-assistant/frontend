import type { HassServiceTarget } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";

export const getEntityTarget = (
  entityId?: string | string[]
): HassServiceTarget | undefined => {
  const entityIds = entityId ? ensureArray(entityId).filter(Boolean) : [];
  return entityIds.length ? { entity_id: entityIds } : undefined;
};
