import type { HassEntity } from "home-assistant-js-websocket";
import { STATES_OFF } from "../../../../common/const";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { usesCoverTiltToggleAction } from "../../../../common/entity/get_toggle_action";
import type { CoverEntity } from "../../../../data/cover";
import { isFullyClosedTilt } from "../../../../data/cover";
import type { HomeAssistant, ServiceCallResponse } from "../../../../types";
import { turnOnOffEntity } from "./turn-on-off-entity";

// A cover that toggles through its tilt does not reflect the tilt in its
// state, so the tilt position decides whether it is off.
const isOff = (stateObj: HassEntity): boolean =>
  usesCoverTiltToggleAction(computeStateDomain(stateObj), stateObj)
    ? isFullyClosedTilt(stateObj as CoverEntity)
    : STATES_OFF.includes(stateObj.state);

export const toggleEntity = (
  hass: HomeAssistant,
  entityId: string
): Promise<ServiceCallResponse> =>
  turnOnOffEntity(hass, entityId, isOff(hass.states[entityId]));
