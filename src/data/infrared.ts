import { computeDeviceName } from "../common/entity/compute_device_name";
import { computeDomain } from "../common/entity/compute_domain";
import { computeEntityName } from "../common/entity/compute_entity_name";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE, UNKNOWN } from "./entity/entity";

// The infrared integration is an entity-type integration: its emitter and
// receiver entities live in the `infrared` domain (their registry platform is
// the providing integration, e.g. broadlink/esphome).
const INFRARED_DOMAIN = "infrared";

export type InfraredProxyType = "emitter" | "receiver";

// A named infrared code, as recorded from a receiver, in the global database
// of known commands.
export interface InfraredCommand {
  id: string;
  name: string;
  code: string;
}

export const fetchInfraredCommands = (hass: HomeAssistant) =>
  hass.callWS<InfraredCommand[]>({ type: "infrared/commands/list" });

export const createInfraredCommand = (
  hass: HomeAssistant,
  values: { name: string; code: string }
) =>
  hass.callWS<InfraredCommand>({
    type: "infrared/commands/create",
    ...values,
  });

export const updateInfraredCommand = (
  hass: HomeAssistant,
  commandId: string,
  updates: { name: string }
) =>
  hass.callWS<InfraredCommand>({
    type: "infrared/commands/update",
    command_id: commandId,
    ...updates,
  });

export const deleteInfraredCommand = (hass: HomeAssistant, commandId: string) =>
  hass.callWS({
    type: "infrared/commands/delete",
    command_id: commandId,
  });

interface InfraredCommandChange {
  change_type: "added" | "updated" | "removed";
  command_id: string;
  item: InfraredCommand;
}

// The backend streams the changes to the command database, so keep the list
// together here and hand callers the whole of it.
export const subscribeInfraredCommands = (
  hass: HomeAssistant,
  callback: (commands: InfraredCommand[]) => void
) => {
  const commands = new Map<string, InfraredCommand>();
  return hass.connection.subscribeMessage<InfraredCommandChange[]>(
    (changes) => {
      for (const change of changes) {
        if (change.change_type === "removed") {
          commands.delete(change.command_id);
        } else {
          commands.set(change.command_id, change.item);
        }
      }
      callback(Array.from(commands.values()));
    },
    { type: "infrared/commands/subscribe" }
  );
};

export const infraredReceiverEntityIds = (
  states: HomeAssistant["states"]
): string[] =>
  Object.keys(states).filter(
    (entityId) =>
      computeDomain(entityId) === INFRARED_DOMAIN &&
      states[entityId].attributes.device_class === "receiver"
  );

export interface InfraredCapturedCode {
  code: string;
  // The id of the known command this signal matches, when there is one.
  duplicate_of: string | null;
}

// Streams the codes a receiver picks up, so a remote's buttons can be
// recorded. Two presses of a button never report the same code, so the backend
// recognizes the ones it already knows.
export const subscribeInfraredReceiver = (
  hass: HomeAssistant,
  entityId: string,
  callback: (captured: InfraredCapturedCode) => void
) =>
  hass.connection.subscribeMessage<InfraredCapturedCode>(callback, {
    type: "infrared/receiver/subscribe",
    entity_id: entityId,
  });

export type InfraredDeviceType = InfraredProxyType | "both";

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

interface InfraredProxyEntity {
  entity_id: string;
  device_id: string | null;
  name: string;
  type: InfraredProxyType;
  online: boolean;
  last_used?: string;
}

// Collect the infrared proxy entities from the entity registry. A proxy is an
// entity in the `infrared` domain, classified as emitter or receiver by its
// device class.
const computeInfraredProxies = (
  entities: HomeAssistant["entities"],
  states: HomeAssistant["states"],
  devices: HomeAssistant["devices"]
): InfraredProxyEntity[] => {
  const proxies: InfraredProxyEntity[] = [];

  for (const entry of Object.values(entities)) {
    if (computeDomain(entry.entity_id) !== INFRARED_DOMAIN) {
      continue;
    }

    const stateObj = states[entry.entity_id];
    const deviceClass = stateObj?.attributes.device_class;
    if (deviceClass !== "emitter" && deviceClass !== "receiver") {
      continue;
    }

    const online = stateObj.state !== UNAVAILABLE;

    // The entity state holds the timestamp the proxy was last used (or
    // unknown/unavailable when it never has been).
    let last_used: string | undefined;
    if (stateObj.state !== UNAVAILABLE && stateObj.state !== UNKNOWN) {
      const time = new Date(stateObj.state).getTime();
      if (!isNaN(time)) {
        last_used = stateObj.state;
      }
    }

    proxies.push({
      entity_id: entry.entity_id,
      device_id: entry.device_id ?? null,
      name: computeEntityName(stateObj, entities, devices) || entry.entity_id,
      type: deviceClass,
      online,
      last_used,
    });
  }

  return proxies;
};

// Group the proxy entities by device. A device exposing both an emitter and a
// receiver entity is reported as type "both".
export const computeInfraredDevices = (
  entities: HomeAssistant["entities"],
  states: HomeAssistant["states"],
  devices: HomeAssistant["devices"]
): InfraredDevice[] => {
  const proxies = computeInfraredProxies(entities, states, devices);

  const groups = new Map<string, InfraredProxyEntity[]>();
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
    const online = group.some((p) => p.online);
    // Across a device's entities, keep the most recent valid timestamp.
    let last_used: string | undefined;
    for (const p of group) {
      if (
        p.last_used &&
        (!last_used ||
          new Date(p.last_used).getTime() > new Date(last_used).getTime())
      ) {
        last_used = p.last_used;
      }
    }
    const { device_id } = group[0];
    const device = device_id ? devices[device_id] : undefined;
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
