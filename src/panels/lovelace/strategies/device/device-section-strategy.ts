import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import { STRINGS_SEPARATOR_DOT } from "../../../../common/const";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityEntryName } from "../../../../common/entity/compute_entity_name_display";
import { stringCompare } from "../../../../common/string/compare";
import {
  computeDeviceEntityCategory,
  type DeviceEntityCategory,
} from "../../../../data/device/device_entity_category";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";
import { findBatteryEntity } from "../../../../data/entity/entity_registry";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../../types";
import type {
  EntitiesCardConfig,
  HeadingCardConfig,
  MarkdownCardConfig,
  TileCardConfig,
} from "../../cards/types";
import type { EntityConfig, SectionConfig } from "../../entity-rows/types";
import type {
  LovelaceStrategyDependency,
  LovelaceStrategyEditor,
} from "../types";

export const DEVICE_SECTION_CATEGORIES = [
  "control",
  "sensor",
  "event",
  "config",
  "diagnostic",
] as const satisfies readonly DeviceEntityCategory[];

export type DeviceSectionCategory = (typeof DEVICE_SECTION_CATEGORIES)[number];

export const DEFAULT_DEVICE_SECTION_CATEGORIES: DeviceSectionCategory[] = [
  "control",
  "sensor",
];

export const DEVICE_SECTION_HEADINGS = ["none", "device", "area"] as const;

export type DeviceSectionHeading = (typeof DEVICE_SECTION_HEADINGS)[number];

export interface DeviceSectionStrategyConfig {
  type: "device";
  device_id?: string;
  categories?: DeviceSectionCategory[];
  display?: "tiles" | "list";
  group_by_category?: boolean;
  heading?: DeviceSectionHeading;
  exclude_entities?: string[];
}

const computeTileConfig = (entityId: string): TileCardConfig => ({
  type: "tile",
  entity: entityId,
  name: { type: "entity" },
});

const computeRowConfig = (entityId: string): EntityConfig => ({
  entity: entityId,
  name: { type: "entity" },
});

const computeDeviceSectionHeading = (
  device: DeviceRegistryEntry,
  heading: Exclude<DeviceSectionHeading, "none">,
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"],
  localize: HomeAssistant["localize"]
): string => {
  const area =
    heading === "area" && device.area_id ? areas[device.area_id] : undefined;
  const parentDevice =
    device.next_name_part === "parent_device" && device.parent_device_id
      ? devices[device.parent_device_id]
      : undefined;

  const parts = [
    area ? computeAreaName(area) : undefined,
    parentDevice ? computeDeviceName(parentDevice) : undefined,
    computeDeviceName(device) ||
      localize("ui.components.device-picker.unnamed_device"),
  ].filter(Boolean);

  return parts.join(STRINGS_SEPARATOR_DOT);
};

@customElement("device-section-strategy")
export class DeviceSectionStrategy extends ReactiveElement {
  static registryDependencies: readonly LovelaceStrategyDependency[] = [
    "entities",
    "devices",
    "areas",
  ];

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./hui-device-section-strategy-editor");
    return document.createElement("hui-device-section-strategy-editor");
  }

  static async generate(
    config: DeviceSectionStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceSectionConfig> {
    const section: LovelaceSectionConfig = {
      type: "grid",
      cards: [],
    };

    const device = config.device_id
      ? hass.devices[config.device_id]
      : undefined;

    if (!device) {
      section.cards!.push({
        type: "markdown",
        content: hass.localize(
          config.device_id
            ? "ui.panel.lovelace.strategy.device.device_not_found"
            : "ui.panel.lovelace.strategy.device.no_device"
        ),
      } satisfies MarkdownCardConfig);
      return section;
    }

    const heading = config.heading ?? "device";

    const categories: readonly DeviceEntityCategory[] =
      config.categories ?? DEFAULT_DEVICE_SECTION_CATEGORIES;

    const entries = Object.values(hass.entities)
      .filter(
        (entry) =>
          entry.device_id === device.id &&
          !entry.hidden &&
          entry.entity_id in hass.states &&
          !config.exclude_entities?.includes(entry.entity_id)
      )
      .sort((entry1, entry2) => {
        const name1 = computeEntityEntryName(entry1);
        const name2 = computeEntityEntryName(entry2);
        if (!name1 || !name2) {
          return Number(!!name1) - Number(!!name2);
        }
        return stringCompare(name1, name2, hass.locale.language);
      });

    const batteryEntry =
      heading !== "none" ? findBatteryEntity(hass.states, entries) : undefined;

    if (heading !== "none") {
      section.cards!.push({
        type: "heading",
        heading: computeDeviceSectionHeading(
          device,
          heading,
          hass.devices,
          hass.areas,
          hass.localize
        ),
        tap_action: hass.user?.is_admin
          ? {
              action: "navigate",
              navigation_path: `/config/devices/device/${device.id}`,
            }
          : { action: "none" },
        badges: batteryEntry
          ? [
              {
                type: "entity",
                entity: batteryEntry.entity_id,
                tap_action: { action: "more-info" },
              },
            ]
          : [],
      } satisfies HeadingCardConfig);
    }

    const entitiesByCategory = new Map<DeviceEntityCategory, string[]>();
    for (const entry of entries) {
      if (entry === batteryEntry) continue;
      const category = computeDeviceEntityCategory(entry);
      if (!categories.includes(category)) continue;
      if (!entitiesByCategory.has(category)) {
        entitiesByCategory.set(category, []);
      }
      entitiesByCategory.get(category)!.push(entry.entity_id);
    }

    const shownCategories = DEVICE_SECTION_CATEGORIES.filter((category) =>
      entitiesByCategory.has(category)
    );
    const showCategoryNames =
      config.group_by_category && shownCategories.length > 1;
    const computeCategoryName = (category: DeviceSectionCategory) =>
      hass.localize(`ui.panel.lovelace.strategy.device.categories.${category}`);

    if (config.display === "list") {
      if (shownCategories.length === 0) {
        return section;
      }
      section.cards!.push({
        type: "entities",
        entities: shownCategories.flatMap((category) => [
          ...(showCategoryNames
            ? [
                {
                  type: "section",
                  label: computeCategoryName(category),
                } satisfies SectionConfig,
              ]
            : []),
          ...entitiesByCategory.get(category)!.map(computeRowConfig),
        ]),
      } satisfies EntitiesCardConfig);
      return section;
    }

    for (const category of shownCategories) {
      if (showCategoryNames) {
        section.cards!.push({
          type: "heading",
          heading_style: "subtitle",
          heading: computeCategoryName(category),
        } satisfies HeadingCardConfig);
      }
      section.cards!.push(
        ...entitiesByCategory.get(category)!.map(computeTileConfig)
      );
    }

    return section;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "device-section-strategy": DeviceSectionStrategy;
  }
}
