import { createContext } from "@lit-labs/context";
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
  };

  used: {
    entities: EntityId[];
    devices: DeviceId[];
    areas: AreaId[];
    domains: Domain[];
  };

  freq: {
    entities: Record<EntityId, number>;
    devices: Record<DeviceId, number>;
    areas: Record<AreaId, number>;
    domains: Record<Domain, number>;
    bySection?: Partial<
      Record<
        AutomationSection,
        {
          entities: Record<EntityId, number>;
          devices: Record<DeviceId, number>;
          areas: Record<AreaId, number>;
          domains: Record<Domain, number>;
        }
      >
    >;
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

const addIds = (
  ids: unknown,
  set: Set<string>,
  freq: Record<string, number>
) => {
  if (ids === undefined || ids === null) return;
  const list = ensureArray(ids) as unknown[];
  for (const item of list) {
    if (typeof item === "string" && item) {
      set.add(item);
      freq[item] = (freq[item] || 0) + 1;
    }
  }
};

export const buildAutomationLocalContext = (
  config: AutomationConfig | undefined,
  _hass: HomeAssistant,
  automationId?: string
): AutomationLocalContext | undefined => {
  if (!config) return undefined;

  const devicesSet = new Set<string>();
  const devicesFreq: Record<string, number> = {};

  const scan = (val: any) => {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      for (const item of val) scan(item);
      return;
    }
    if (typeof val !== "object") return;

    if ("device_id" in val) {
      addIds((val as any).device_id, devicesSet, devicesFreq);
    }
    if ("target" in val && val.target && typeof val.target === "object") {
      if ("device_id" in (val.target as any)) {
        addIds((val.target as any).device_id, devicesSet, devicesFreq);
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

  // Sort used devices by frequency desc, then by id for stability
  const usedDevices = Array.from(devicesSet).sort((a, b) => {
    const fa = devicesFreq[a] || 0;
    const fb = devicesFreq[b] || 0;
    if (fb !== fa) return fb - fa;
    return a.localeCompare(b);
  });

  return {
    meta: {
      automationId,
    },
    used: {
      entities: [],
      devices: usedDevices,
      areas: [],
      domains: [],
    },
    freq: {
      entities: {},
      devices: devicesFreq,
      areas: {},
      domains: {},
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
