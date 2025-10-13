import { createContext } from "@lit/context";
import type { HomeAssistant } from "../types";
import type { AutomationConfig } from "./automation";
import { ensureArray } from "../common/array/ensure-array";

export type AutomationSection = "triggers" | "conditions" | "actions";

export type EntityId = string;
export type DeviceId = string;
export type AreaId = string;
export type Domain = string;

export interface AutomationLocalContext {
  meta: {
    automationId?: string;
    signature: string;
  };

  used: {
    entities: EntityId[];
    devices: DeviceId[];
    areas: AreaId[];
    domains: Domain[];
  };

  maps: {
    entityArea: Record<EntityId, AreaId | null>;
    entityDevice: Record<EntityId, DeviceId | null>;
    deviceArea: Record<DeviceId, AreaId | null>;
    deviceDomains: Record<DeviceId, Domain[]>;
  };

  weights?: {
    used: number;
    sameDomain: number;
    sameArea: number;
  };

  hints?: {
    lastEditedPath?: string[] | number[];
    labels?: string[];
    services?: string[];
  };
}

/**
 * Context key for the automation editor locality context.
 */
export const automationEditorContext = createContext<
  AutomationLocalContext | undefined
>("automationEditorContext");

const addIds = (ids: unknown, set: Set<string>) => {
  if (ids === undefined || ids === null) return;
  const list = ensureArray(ids) as unknown[];
  for (const item of list) {
    if (typeof item === "string" && item) {
      set.add(item);
    }
  }
};

const getContextSignature = (devices: Set<string>): string =>
  Array.from(devices.values())
    .map((d) => d.slice(0, 6))
    .sort()
    .join();

export const buildAutomationLocalContext = (
  config: AutomationConfig | undefined,
  _hass: HomeAssistant,
  automationId?: string,
  previous?: AutomationLocalContext
): AutomationLocalContext | undefined => {
  if (!config) return undefined;

  const devicesSet = new Set<string>();

  const scan = (val: any) => {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      for (const item of val) scan(item);
      return;
    }
    if (typeof val !== "object") return;

    if ("device_id" in val) {
      addIds((val as any).device_id, devicesSet);
    }
    if ("target" in val && val.target && typeof val.target === "object") {
      if ("device_id" in (val.target as any)) {
        addIds((val.target as any).device_id, devicesSet);
      }
    }

    for (const key of Object.keys(val)) {
      const child = (val as any)[key];
      if (child && typeof child === "object") {
        scan(child);
      }
    }
  };

  scan(config.triggers);
  scan(config.conditions);
  scan(config.actions);

  // Avoid re-rendering if nothing changed
  const signature = getContextSignature(devicesSet);
  if (previous && previous.meta.signature === signature) {
    return previous;
  }

  return {
    meta: {
      automationId,
      signature,
    },
    used: {
      entities: [],
      devices: Array.from(devicesSet),
      areas: [],
      domains: [],
    },
    maps: {
      entityArea: {},
      entityDevice: {},
      deviceArea: Object.fromEntries(
        Object.entries(_hass.devices || {}).map(([id, dev]) => [
          id,
          dev.area_id || null,
        ])
      ),
      deviceDomains: {},
    },
  };
};
