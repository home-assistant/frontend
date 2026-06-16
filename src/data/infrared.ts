import { computeDeviceName } from "../common/entity/compute_device_name";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE, UNKNOWN } from "./entity/entity";

export type InfraredProxyType = "emitter" | "receiver";

export type InfraredDeviceType = InfraredProxyType | "both";

export interface InfraredProxy {
  entity_id: string;
  device_id: string | null;
  config_entry_id: string | null;
  name: string;
  type: InfraredProxyType;
}

export interface InfraredDevice {
  id: string;
  device_id: string | null;
  name: string;
  type: InfraredDeviceType;
  online: boolean;
  // Most recent last-used timestamp (entity state) across the device's
  // entities, as an ISO string. Undefined when never used.
  last_used?: string;
  entity_ids: string[];
}

export const listInfraredProxies = (
  hass: HomeAssistant
): Promise<{ proxies: InfraredProxy[] }> =>
  hass.callWS({
    type: "infrared/list",
  });

// Group the proxy entities by device. A device exposing both an emitter and a
// receiver entity is reported as type "both".
export const computeInfraredDevices = (
  proxies: InfraredProxy[],
  hass: HomeAssistant
): InfraredDevice[] => {
  const groups = new Map<string, InfraredProxy[]>();
  for (const proxy of proxies) {
    const key = proxy.device_id ?? `entity:${proxy.entity_id}`;
    const group = groups.get(key);
    if (group) {
      group.push(proxy);
    } else {
      groups.set(key, [proxy]);
    }
  }

  return Array.from(groups.values(), (group) => {
    const hasEmitter = group.some((p) => p.type === "emitter");
    const hasReceiver = group.some((p) => p.type === "receiver");
    const type: InfraredDeviceType =
      hasEmitter && hasReceiver ? "both" : hasEmitter ? "emitter" : "receiver";
    const online = group.some((p) => {
      const stateObj = hass.states[p.entity_id];
      return stateObj !== undefined && stateObj.state !== UNAVAILABLE;
    });
    // The entity state holds the timestamp the proxy was last used (or
    // unknown/unavailable when it never has been). Across a device's entities,
    // keep the most recent valid timestamp.
    let last_used: string | undefined;
    for (const p of group) {
      const state = hass.states[p.entity_id]?.state;
      if (!state || state === UNAVAILABLE || state === UNKNOWN) {
        continue;
      }
      const time = new Date(state).getTime();
      if (
        !isNaN(time) &&
        (!last_used || time > new Date(last_used).getTime())
      ) {
        last_used = state;
      }
    }
    const { device_id } = group[0];
    const device = device_id ? hass.devices[device_id] : undefined;
    const name = (device && computeDeviceName(device)) || group[0].name;

    return {
      id: device_id ?? group[0].entity_id,
      device_id,
      name,
      type,
      online,
      last_used,
      entity_ids: group.map((p) => p.entity_id),
    };
  });
};
