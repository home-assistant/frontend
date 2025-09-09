import type {
  LovelaceSectionConfig,
  LovelaceStrategySectionConfig,
} from "../../../data/lovelace/config/section";
import type { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import type {
  LovelaceConfig,
  LovelaceDashboardStrategyConfig,
  LovelaceRawConfig,
} from "../../../data/lovelace/config/types";
import { isStrategyDashboard } from "../../../data/lovelace/config/types";
import type {
  LovelaceStrategyViewConfig,
  LovelaceViewConfig,
} from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";
import type { AsyncReturnType, HomeAssistant } from "../../../types";
import { cleanLegacyStrategyConfig, isLegacyStrategy } from "./legacy-strategy";
import type {
  LovelaceDashboardStrategy,
  LovelaceSectionStrategy,
  LovelaceStrategy,
  LovelaceViewStrategy,
} from "./types";

const MAX_WAIT_STRATEGY_LOAD = 5000;
const CUSTOM_PREFIX = "custom:";

const STRATEGIES: Record<LovelaceStrategyConfigType, Record<string, any>> = {
  dashboard: {
    "original-states": () =>
      import("./original-states/original-states-dashboard-strategy"),
    map: () => import("./map/map-dashboard-strategy"),
    iframe: () => import("./iframe/iframe-dashboard-strategy"),
    areas: () => import("./areas/areas-dashboard-strategy"),
    home: () => import("./home/home-dashboard-strategy"),
  },
  view: {
    "original-states": () =>
      import("./original-states/original-states-view-strategy"),
    energy: () => import("../../energy/strategies/energy-view-strategy"),
    map: () => import("./map/map-view-strategy"),
    iframe: () => import("./iframe/iframe-view-strategy"),
    area: () => import("./areas/area-view-strategy"),
    "areas-overview": () => import("./areas/areas-overview-view-strategy"),
    "home-main": () => import("./home/home-main-view-strategy"),
    "home-lights": () => import("./home/home-lights-view-strategy"),
    "home-climate": () => import("./home/home-climate-view-strategy"),
    "home-security": () => import("./home/home-security-view-strategy"),
    "home-media-players": () =>
      import("./home/home-media-players-view-strategy"),
    "home-area": () => import("./home/home-area-view-strategy"),
  },
  section: {},
};

export type LovelaceStrategyConfigType = "dashboard" | "view" | "section";

interface Strategies {
  dashboard: LovelaceDashboardStrategy;
  view: LovelaceViewStrategy;
  section: LovelaceSectionStrategy;
}

type StrategyConfig<T extends LovelaceStrategyConfigType> = AsyncReturnType<
  Strategies[T]["generate"]
>;

export const getLovelaceStrategy = async <T extends LovelaceStrategyConfigType>(
  configType: T,
  strategyType: string
): Promise<LovelaceStrategy> => {
  if (strategyType in STRATEGIES[configType]) {
    await STRATEGIES[configType][strategyType]();
    const tag = `${strategyType}-${configType}-strategy`;
    return customElements.get(tag) as unknown as Strategies[T];
  }

  if (!strategyType.startsWith(CUSTOM_PREFIX)) {
    throw new Error("Unknown strategy");
  }

  const legacyTag = `ll-strategy-${strategyType.slice(CUSTOM_PREFIX.length)}`;
  const tag = `ll-strategy-${configType}-${strategyType.slice(
    CUSTOM_PREFIX.length
  )}`;

  if (
    (await Promise.race([
      customElements.whenDefined(legacyTag),
      customElements.whenDefined(tag),
      new Promise((resolve) => {
        setTimeout(() => resolve(true), MAX_WAIT_STRATEGY_LOAD);
      }),
    ])) === true
  ) {
    throw new Error(
      `Timeout waiting for strategy element ${tag} to be registered`
    );
  }

  return (customElements.get(tag) ??
    customElements.get(legacyTag)) as unknown as Strategies[T];
};

const generateStrategy = async <T extends LovelaceStrategyConfigType>(
  configType: T,
  renderError: (err: string | Error) => StrategyConfig<T>,
  strategyConfig: LovelaceStrategyConfig,
  hass: HomeAssistant
): Promise<StrategyConfig<T>> => {
  const strategyType = strategyConfig.type;
  if (!strategyType) {
    // @ts-ignore
    return renderError("No strategy type found");
  }

  try {
    const strategy = await getLovelaceStrategy<T>(configType, strategyType);

    // Backward compatibility for custom strategies for loading old strategies format
    if (isLegacyStrategy(strategy)) {
      if (configType === "dashboard" && "generateDashboard" in strategy) {
        return (await strategy.generateDashboard({
          config: { strategy: strategyConfig, views: [] },
          hass,
        })) as StrategyConfig<T>;
      }
      if (configType === "view" && "generateView" in strategy) {
        return (await strategy.generateView({
          config: { views: [] },
          view: { strategy: strategyConfig },
          hass,
        })) as StrategyConfig<T>;
      }
    }

    const config = cleanLegacyStrategyConfig(strategyConfig);

    return await strategy.generate(config, hass);
  } catch (err: any) {
    if (err.message !== "timeout") {
      // eslint-disable-next-line
      console.error(err);
    }
    // @ts-ignore
    return renderError(err);
  }
};

export const generateLovelaceDashboardStrategy = async (
  config: LovelaceDashboardStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceConfig> => {
  const { strategy, ...base } = config;
  const generated = await generateStrategy(
    "dashboard",
    (err) => ({
      views: [
        {
          title: "Error",
          cards: [
            {
              type: "markdown",
              content: `Error loading the dashboard strategy:\n> ${err}`,
            },
          ],
        },
      ],
    }),
    strategy,
    hass
  );
  return {
    ...base,
    ...generated,
  };
};

export const generateLovelaceViewStrategy = async (
  config: LovelaceStrategyViewConfig,
  hass: HomeAssistant
): Promise<LovelaceViewConfig> => {
  const { strategy, ...base } = config;
  const generated = await generateStrategy(
    "view",
    (err) => ({
      cards: [
        {
          type: "markdown",
          content: `Error loading the view strategy:\n> ${err}`,
        },
      ],
    }),
    strategy,
    hass
  );
  return {
    ...base,
    ...generated,
  };
};

export const generateLovelaceSectionStrategy = async (
  config: LovelaceStrategySectionConfig,
  hass: HomeAssistant
): Promise<LovelaceSectionConfig> => {
  const { strategy, ...base } = config;
  const generated = await generateStrategy(
    "section",
    (err) => ({
      cards: [
        {
          type: "markdown",
          content: `Error loading the section strategy:\n> ${err}`,
        },
      ],
    }),
    strategy,
    hass
  );
  return {
    ...base,
    ...generated,
  };
};

/**
 * Find all references to strategies and replaces them with the generated output
 */
export const expandLovelaceConfigStrategies = async (
  config: LovelaceRawConfig,
  hass: HomeAssistant
): Promise<LovelaceConfig> => {
  const newConfig = isStrategyDashboard(config)
    ? await generateLovelaceDashboardStrategy(config, hass)
    : { ...config };

  newConfig.views = await Promise.all(
    newConfig.views.map(async (view) => {
      const newView = isStrategyView(view)
        ? await generateLovelaceViewStrategy(view, hass)
        : { ...view };

      if (newView.sections) {
        newView.sections = await Promise.all(
          newView.sections.map(async (section) => {
            const newSection = isStrategyView(section)
              ? await generateLovelaceSectionStrategy(section, hass)
              : { ...section };
            return newSection;
          })
        );
      }

      return newView;
    })
  );

  return newConfig;
};
