import { LovelaceConfig, LovelaceViewConfig } from "../../../data/lovelace";
import { AsyncReturnType, HomeAssistant } from "../../../types";
import { OriginalStatesStrategy } from "./original-states-strategy";

const MAX_WAIT_STRATEGY_LOAD = 5000;
const CUSTOM_PREFIX = "custom:";

export interface LovelaceDashboardStrategy {
  generateDashboard(info: {
    config?: LovelaceConfig;
    hass: HomeAssistant;
    narrow: boolean | undefined;
  }): Promise<LovelaceConfig>;
}

export interface LovelaceViewStrategy {
  generateView(info: {
    view: LovelaceViewConfig;
    config: LovelaceConfig;
    hass: HomeAssistant;
    narrow: boolean | undefined;
  }): Promise<LovelaceViewConfig>;
}

const strategies: Record<
  string,
  LovelaceDashboardStrategy & LovelaceViewStrategy
> = {
  "original-states": OriginalStatesStrategy,
};

const getLovelaceStrategy = async <
  T extends LovelaceDashboardStrategy | LovelaceViewStrategy
>(
  name: string
): Promise<T> => {
  if (name in strategies) {
    return strategies[name] as T;
  }

  if (!name.startsWith(CUSTOM_PREFIX)) {
    throw new Error("Unknown strategy");
  }

  const tag = `ll-strategy-${name.substr(CUSTOM_PREFIX.length)}`;

  await Promise.race([
    customElements.whenDefined(tag),
    new Promise((_, reject) =>
      setTimeout(() => reject("timeout"), MAX_WAIT_STRATEGY_LOAD)
    ),
  ]);

  return customElements.get(tag);
};

interface GenerateMethods {
  generateDashboard: LovelaceDashboardStrategy["generateDashboard"];
  generateView: LovelaceViewStrategy["generateView"];
}

const generateStrategy = async <T extends keyof GenerateMethods>(
  generateMethod: T,
  renderError: (err: string | Error) => AsyncReturnType<GenerateMethods[T]>,
  info: Parameters<GenerateMethods[T]>[0],
  name: string | undefined
): Promise<ReturnType<GenerateMethods[T]>> => {
  if (!name) {
    return renderError("No strategy name found");
  }

  try {
    const strategy = (await getLovelaceStrategy(name)) as any;
    return await strategy[generateMethod](info);
  } catch (err) {
    if (err.message !== "timeout") {
      // eslint-disable-next-line
      console.error(err);
    }

    return renderError(err);
  }
};

export const generateLovelaceDashboardStrategy = async (
  info: Parameters<LovelaceDashboardStrategy["generateDashboard"]>[0],
  name?: string
): Promise<ReturnType<LovelaceDashboardStrategy["generateDashboard"]>> =>
  generateStrategy(
    "generateDashboard",
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
    name || info.config?.strategy?.name
  );

export const generateLovelaceViewStrategy = async (
  info: Parameters<LovelaceViewStrategy["generateView"]>[0],
  name?: string
): Promise<ReturnType<LovelaceViewStrategy["generateView"]>> =>
  generateStrategy(
    "generateView",
    (err) => ({
      cards: [
        {
          type: "markdown",
          content: `Error loading the view strategy:\n> ${err}`,
        },
      ],
    }),
    info,
    name || info.view?.strategy?.name
  );
