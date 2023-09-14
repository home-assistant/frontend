import { LovelaceConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { AsyncReturnType } from "../../../types";
import {
  LovelaceDashboardStrategy,
  LovelaceStrategy,
  LovelaceStrategyConfigType,
  LovelaceStrategyInfo,
  LovelaceViewStrategy,
} from "./types";

const MAX_WAIT_STRATEGY_LOAD = 5000;
const CUSTOM_PREFIX = "custom:";

const STRATEGIES: Record<LovelaceStrategyConfigType, Record<string, any>> = {
  dashboard: {
    "original-states": () => import("./original-states-dashboard-strategy"),
  },
  view: {
    "original-states": () => import("./original-states-view-strategy"),
    energy: () => import("../../energy/strategies/energy-view-strategy"),
  },
};

type Strategies = {
  dashboard: LovelaceDashboardStrategy;
  view: LovelaceViewStrategy;
};

type StrategyConfig<T extends LovelaceStrategyConfigType> = AsyncReturnType<
  Strategies[T]["generate"]
>;

const getLovelaceStrategy = async <T extends LovelaceStrategyConfigType>(
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

  const tag = `ll-strategy-${configType}-${strategyType.slice(
    CUSTOM_PREFIX.length
  )}`;

  if (
    (await Promise.race([
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

  return customElements.get(tag) as unknown as Strategies[T];
};

const generateStrategy = async <T extends LovelaceStrategyConfigType>(
  configType: T,
  renderError: (err: string | Error) => StrategyConfig<T>,
  info: LovelaceStrategyInfo<StrategyConfig<T>>,
  strategyType: string | undefined
): Promise<StrategyConfig<T>> => {
  if (!strategyType) {
    // @ts-ignore
    return renderError("No strategy type found");
  }

  try {
    const strategy = await getLovelaceStrategy<T>(configType, strategyType);
    // eslint-disable-next-line @typescript-eslint/return-await
    return await strategy.generate(info);
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
  info: LovelaceStrategyInfo<LovelaceConfig>
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
    info,
    info.config?.strategy?.type
  );

export const generateLovelaceViewStrategy = async (
  info: LovelaceStrategyInfo<LovelaceViewConfig>
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
    info,
    info.config?.strategy?.type
  );

/**
 * Find all references to strategies and replaces them with the generated output
 */
export const expandLovelaceConfigStrategies = async (
  info: LovelaceStrategyInfo<LovelaceConfig>
): Promise<LovelaceConfig> => {
  const config = info.config.strategy
    ? await generateLovelaceDashboardStrategy(info)
    : { ...info.config };

  config.views = await Promise.all(
    config.views.map((view) =>
      view.strategy
        ? generateLovelaceViewStrategy({
            hass: info.hass,
            narrow: info.narrow,
            config: view,
          })
        : view
    )
  );

  return config;
};
