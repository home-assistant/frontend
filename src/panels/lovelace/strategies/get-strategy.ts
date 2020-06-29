import { LovelaceDashboardStrategy } from "../../../data/lovelace";

const CUSTOM_PREFIX = "custom:";

const strategies: { [key: string]: () => Promise<any> } = {
  default: () => Promise.resolve(SingleViewLovelaceDashboardStrategy),
  by_view: () => import("./by_view").ByViewLovelaceDashboardStrategy,
};

export const getLovelaceDashboardStrategy = (
  name: string
): Promise<LovelaceDashboardStrategy> => {
  if (name in strategies) {
    return strategies[name]();
  }

  if (!name.startsWith(CUSTOM_PREFIX)) {
    // This will just generate a view with a single error card
    return errorStrategy(`Unknown strategy specified: ${name}`);
  }

  const tag = `ll-strategy-${name.substr(CUSTOM_PREFIX.length)}`;

  return customElements.whenDefined(tag).then(() => customElements.get(tag));
};

// To define a custom strategy
customElements.define(
  "ll-strategy-paulus",
  class extends HTMLElement {
    static generateDashboard(info) {
      return {
        views: [
          {
            strategy: {
              name: "custom:paulus",
            },
          },
        ],
      };
    }

    static generateView(info) {
      return {
        cards: [],
      };
    }
  }
);
