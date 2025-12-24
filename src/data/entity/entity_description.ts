import type { HomeAssistant } from "../../types";

export interface EntityDescription {
  entity_id: string;
  description: string | undefined;
}

export const getEntityDescription = (
  entity_id: string,
  descriptions: EntityDescription[]
): string | undefined => {
  let description;
  if (descriptions.length > 0) {
    const entry = descriptions.find((_entry) => _entry.entity_id === entity_id);
    if (entry) description = entry.description;
  }
  return description;
};

interface GetEntityConfigFuncResult {
  config: { description: string | undefined };
}

type GetEntityConfigFunc = (
  hass: HomeAssistant,
  entity_id: string
) => Promise<GetEntityConfigFuncResult | any>;

export const setEntityDescription = (
  hass: HomeAssistant,
  entity_id: string,
  descriptions: EntityDescription[],
  getEntityConfigFunc: GetEntityConfigFunc
) => {
  getEntityConfigFunc(hass, entity_id).then((result) => {
    let entry;
    if (descriptions.length > 0) {
      entry = descriptions.find((_entry) => _entry.entity_id === entity_id);
    }
    if (entry) {
      entry.description = result.config.description ?? undefined;
    } else {
      descriptions.push({
        entity_id: entity_id,
        description: result.config.description ?? undefined,
      });
    }
  });
};
