import { generateEntityFilter } from "../../common/entity/entity_filter";
import type { HomeAssistant } from "../../types";

export type AreaControlDomain =
  | "light"
  | "fan"
  | "switch"
  | "cover-shutter"
  | "cover-blind"
  | "cover-curtain"
  | "cover-shade"
  | "cover-awning"
  | "cover-garage"
  | "cover-gate"
  | "cover-door"
  | "cover-window"
  | "cover-damper";

export interface AreaControlsButton {
  filter: {
    domain: string;
    device_class?: string | string[];
  };
}

const coverButton = (deviceClass: string): AreaControlsButton => ({
  filter: {
    domain: "cover",
    device_class: deviceClass,
  },
});

export const AREA_CONTROLS_BUTTONS: Record<
  AreaControlDomain,
  AreaControlsButton
> = {
  light: {
    filter: {
      domain: "light",
    },
  },
  fan: {
    filter: {
      domain: "fan",
    },
  },
  switch: {
    filter: {
      domain: "switch",
    },
  },
  "cover-blind": coverButton("blind"),
  "cover-curtain": coverButton("curtain"),
  "cover-damper": coverButton("damper"),
  "cover-awning": coverButton("awning"),
  "cover-door": coverButton("door"),
  "cover-garage": coverButton("garage"),
  "cover-gate": coverButton("gate"),
  "cover-shade": coverButton("shade"),
  "cover-shutter": coverButton("shutter"),
  "cover-window": coverButton("window"),
};

export const getAreaControlEntities = (
  controls: AreaControlDomain[],
  areaId: string,
  excludeEntities: string[] | undefined,
  hass: HomeAssistant
): Record<AreaControlDomain, string[]> =>
  controls.reduce(
    (acc, control) => {
      const controlButton = AREA_CONTROLS_BUTTONS[control];
      const filter = generateEntityFilter(hass, {
        area: areaId,
        entity_category: "none",
        ...controlButton.filter,
      });

      acc[control] = Object.keys(hass.entities).filter(
        (entityId) => filter(entityId) && !excludeEntities?.includes(entityId)
      );
      return acc;
    },
    {} as Record<AreaControlDomain, string[]>
  );

export const MAX_DEFAULT_AREA_CONTROLS = 4;
