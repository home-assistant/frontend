import {
  LovelaceConfig,
  LovelaceRawConfig,
  isStrategyDashboard,
} from "../../../data/lovelace/config/types";
import { LovelaceStrategyConfig } from "../../../data/lovelace/config/strategy";
import {
  LovelaceViewConfig,
  isStrategyView,
} from "../../../data/lovelace/config/view";
import { AsyncReturnType, HomeAssistant } from "../../../types";
import { cleanLegacyStrategyConfig, isLegacyStrategy } from "./legacy-strategy";
import {
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
  },
  view: {
    "original-states": () =>
      import("./original-states/original-states-view-strategy"),
    energy: () => import("../../energy/strategies/energy-view-strategy"),
    map: () => import("./map/map-view-strategy"),
  },
  section: {},
};

export type LovelaceStrategyConfigType = "dashboard" | "view" | "section";

type Strategies = {
  dashboard: LovelaceDashboardStrategy;
  view: LovelaceViewStrategy;
  section: LovelaceSectionStrategy;
};

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
  strategyConfig: LovelaceStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceConfig> =>
  generateStrategy(
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
    strategyConfig,
    hass
  );

export const generateLovelaceViewStrategy = async (
  strategyConfig: LovelaceStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceViewConfig> =>
  generateStrategy(
    "view",
    (err) => ({
      cards: [
        {
          type: "markdown",
          content: `Error loading the view strategy:\n> ${err}`,
        },
      ],
    }),
    strategyConfig,
    hass
  );

export const generateLovelaceSectionStrategy = async (
  strategyConfig: LovelaceStrategyConfig,
  hass: HomeAssistant
): Promise<LovelaceViewConfig> =>
  generateStrategy(
    "section",
    (err) => ({
      cards: [
        {
          type: "markdown",
          content: `Error loading the section strategy:\n> ${err}`,
        },
      ],
    }),
    strategyConfig,
    hass
  );

/**
 * Find all references to strategies and replaces them with the generated output
 */
export const expandLovelaceConfigStrategies = async (
  config: LovelaceRawConfig,
  hass: HomeAssistant
): Promise<LovelaceConfig> => {
  const newConfig = isStrategyDashboard(config)
    ? await generateLovelaceDashboardStrategy(config.strategy, hass)
    : { ...config };

  newConfig.views = await Promise.all(
    newConfig.views.map(async (view) => {
      const newView = isStrategyView(view)
        ? await generateLovelaceViewStrategy(view.strategy, hass)
        : { ...view };

      if (newView.sections) {
        newView.sections = await Promise.all(
          newView.sections.map(async (section) => {
            const newSection = isStrategyView(section)
              ? await generateLovelaceSectionStrategy(section.strategy, hass)
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
