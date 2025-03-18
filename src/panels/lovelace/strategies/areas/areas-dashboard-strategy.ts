import { ReactiveElement } from "lit";
import { customElement } from "lit/decorators";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../../types";
import type {
  AreaViewStrategyConfig,
  EntitiesDisplay,
} from "./area-view-strategy";
import type { LovelaceStrategyEditor } from "../types";
import type { AreasViewStrategyConfig } from "./areas-view-strategy";
import { computeAreaPath, getAreas } from "./helpers/areas-strategy-helpers";

interface AreaConfig {
  groups?: Record<
    string,
    EntitiesDisplay & {
      overview_hidden?: string[];
    }
  >;
}

export interface AreasDashboardStrategyConfig {
  type: "areas";
  areas_display?: {
    hidden?: string[];
    order?: string[];
  };
  areas?: Record<string, AreaConfig>;
}

function computeOverviewAreasConfig(
  areas: Record<string, AreaConfig>
): Record<string, AreaConfig> {
  const output: Record<string, AreaConfig> = {};

  for (const [areaId, areaConfig] of Object.entries(areas)) {
    output[areaId] = { groups: {} };

    if (!areaConfig.groups) continue;

    for (const [group, groupData] of Object.entries(areaConfig.groups)) {
      const { overview_hidden = [], hidden = [], order = [] } = groupData;

      output[areaId].groups![group] = {
        hidden: [...overview_hidden, ...hidden],
        order: order,
      };
    }
  }

  return output;
}

@customElement("areas-dashboard-strategy")
export class AreasDashboardStrategy extends ReactiveElement {
  static async generate(
    config: AreasDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const areas = getAreas(
      hass.areas,
      config.areas_display?.hidden,
      config.areas_display?.order
    );

    const areaViews = areas.map<LovelaceViewRawConfig>((area) => {
      const path = computeAreaPath(area.area_id);
      const areaConfig = config.areas?.[area.area_id];

      return {
        title: area.name,
        path: path,
        strategy: {
          type: "area",
          area: area.area_id,
          groups: areaConfig?.groups,
        } satisfies AreaViewStrategyConfig,
      };
    });

    const overviewAreas = config.areas
      ? computeOverviewAreasConfig(config.areas)
      : undefined;

    return {
      views: [
        {
          title: "Home",
          icon: "mdi:home",
          path: "home",
          strategy: {
            type: "areas",
            areas_display: config.areas_display,
            areas: overviewAreas,
          } satisfies AreasViewStrategyConfig,
        },
        ...areaViews,
      ],
    };
  }

  public static async getConfigElement(): Promise<LovelaceStrategyEditor> {
    await import("./editor/hui-areas-dashboard-strategy-editor");
    return document.createElement("hui-areas-dashboard-strategy-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "areas-dashboard-strategy": AreasDashboardStrategy;
  }
}
