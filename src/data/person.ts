import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";

import type { HomeAssistant } from "../types";

export interface BasePerson {
  name: string;
  picture?: string;
}

export interface Person extends BasePerson {
  id: string;
  user_id?: string;
  device_trackers?: string[];
}

export interface PersonMutableParams {
  name: string;
  user_id: string | null;
  device_trackers: string[];
  picture: string | null;
}

interface PersonEntityAttributes extends HassEntityAttributeBase {
  id?: string;
  user_id?: string;
  device_trackers?: string[];
  editable?: boolean;
  gps_accuracy?: number;
  latitude?: number;
  longitude?: number;
}

export interface PersonEntity extends HassEntityBase {
  attributes: PersonEntityAttributes;
}

export const fetchPersons = (hass: HomeAssistant) =>
  hass.callWS<{
    storage: Person[];
    config: Person[];
  }>({ type: "person/list" });

export const createPerson = (
  hass: HomeAssistant,
  values: PersonMutableParams
) =>
  hass.callWS<Person>({
    type: "person/create",
    ...values,
  });

export const updatePerson = (
  hass: HomeAssistant,
  personId: string,
  updates: Partial<PersonMutableParams>
) =>
  hass.callWS<Person>({
    type: "person/update",
    person_id: personId,
    ...updates,
  });

export const deletePerson = (hass: HomeAssistant, personId: string) =>
  hass.callWS({
    type: "person/delete",
    person_id: personId,
  });

const cachedUserPerson: Record<string, string> = {};

export const getUserPerson = (hass: HomeAssistant): undefined | HassEntity => {
  if (!hass.user?.id) {
    return undefined;
  }
  const cachedPersonEntityId = cachedUserPerson[hass.user.id];
  if (cachedPersonEntityId) {
    const stateObj = hass.states[cachedPersonEntityId];
    if (stateObj && stateObj.attributes.user_id === hass.user.id) {
      return stateObj;
    }
  }

  const result = Object.values(hass.states).find(
    (state) =>
      state.attributes.user_id === hass.user!.id &&
      computeDomain(state.entity_id) === "person"
  );
  if (result) {
    cachedUserPerson[hass.user.id] = result[0];
    return result[1];
  }
  return undefined;
};
