import type {
  HassEntities,
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { computeStateDomain } from "../common/entity/compute_state_domain";

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

export interface OwnProfileMutableParams {
  name: string;
  picture: string | null;
}

export const updateOwnProfile = (
  callWS: HomeAssistant["callWS"],
  updates: Partial<OwnProfileMutableParams>
) =>
  callWS<{ user_name: string; person: Person | null }>({
    type: "person/update_own_profile",
    ...updates,
  });

const cachedUserPerson: Record<string, string> = {};

export const getUserPerson = (
  userId: string | undefined,
  states: HassEntities
): undefined | HassEntity => {
  if (!userId) {
    return undefined;
  }
  const cachedPersonEntityId = cachedUserPerson[userId];
  if (cachedPersonEntityId) {
    const stateObj = states[cachedPersonEntityId];
    if (stateObj && stateObj.attributes.user_id === userId) {
      return stateObj;
    }
  }

  const result = Object.values(states).find(
    (state) =>
      state.attributes.user_id === userId &&
      computeStateDomain(state) === "person"
  );
  if (result) {
    cachedUserPerson[userId] = result.entity_id;
  }
  return result;
};
