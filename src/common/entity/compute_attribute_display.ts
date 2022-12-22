import { HassEntity } from "home-assistant-js-websocket";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { HomeAssistant } from "../../types";
import { LocalizeFunc } from "../translations/localize";
import { computeDomain } from "./compute_domain";

export const computeAttributeValueDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  attribute: string,
  value?: any
): string => {
  const entityId = stateObj.entity_id;
  const attributeValue =
    value !== undefined ? value : stateObj.attributes[attribute];
  const domain = computeDomain(entityId);
  const entity = entities[entityId] as EntityRegistryEntry | undefined;
  const translationKey = entity?.translation_key;

  return (
    (translationKey &&
      localize(
        `component.${entity.platform}.entity.${domain}.${translationKey}.state_attributes.${attribute}.state.${attributeValue}`
      )) ||
    localize(
      `component.${domain}.state_attributes._.${attribute}.state.${attributeValue}`
    ) ||
    // @ts-ignore For backward compatibility
    localize(`state_attributes.${domain}.${attribute}.${attributeValue}`) ||
    attributeValue
  );
};

export const computeAttributeNameDisplay = (
  localize: LocalizeFunc,
  stateObj: HassEntity,
  entities: HomeAssistant["entities"],
  attribute: string
): string => {
  const entityId = stateObj.entity_id;
  const domain = computeDomain(entityId);
  const entity = entities[entityId] as EntityRegistryEntry | undefined;
  const translationKey = entity?.translation_key;

  return (
    (translationKey &&
      localize(
        `component.${entity.platform}.entity.${domain}.${translationKey}.state_attributes.${attribute}.name`
      )) ||
    localize(`component.${domain}.state_attributes._.${attribute}.name`) ||
    attribute
  );
};
