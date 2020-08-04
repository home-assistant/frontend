import { HomeAssistant } from "../types";

export interface OZWDevice {
  node_id: number;
  node_query_stage: string;
  is_awake: boolean;
  is_failed: boolean;
  is_zwave_plus: boolean;
  ozw_instance: number;
}

export const fetchOZWNodeStatus = (
  hass: HomeAssistant,
  ozw_instance: string,
  node_id: string
): Promise<OZWDevice> =>
  hass.callWS({
    type: "ozw/node_status",
    ozw_instance: ozw_instance,
    node_id: node_id,
  });
