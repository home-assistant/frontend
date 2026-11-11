import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistantRegistries } from "../../types";
import { isSecurityPanelEntity } from "./strategies/security-view-strategy";

export const createSecurityEntityFilter =
  (
    getStates: () => HassEntities | null | undefined,
    getRegistries: () => HomeAssistantRegistries | null | undefined
  ) =>
  (entity: HassEntity): boolean => {
    const states = getStates();
    const registries = getRegistries();
    return states && registries
      ? isSecurityPanelEntity(
          states,
          registries.entities,
          registries.devices,
          registries.areas,
          registries.floors,
          entity
        )
      : false;
  };
