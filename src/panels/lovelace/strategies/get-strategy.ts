import { LovelaceDashboardStrategy } from "../../../data/lovelace";
import { DefaultStrategy } from "./default-strategy";

const CUSTOM_PREFIX = "custom:";

const strategies: Record<string, LovelaceDashboardStrategy> = {
  default: DefaultStrategy,
};

export const getLovelaceDashboardStrategy = async (
  name: string
): Promise<LovelaceDashboardStrategy> => {
  if (name in strategies) {
    return strategies[name];
  }

  if (!name.startsWith(CUSTOM_PREFIX)) {
    // This will just generate a view with a single error card
    // return errorStrategy(`Unknown strategy specified: ${name}`);
  }

  const tag = `ll-strategy-${name.substr(CUSTOM_PREFIX.length)}`;

  return customElements.whenDefined(tag).then(() => customElements.get(tag));
};
