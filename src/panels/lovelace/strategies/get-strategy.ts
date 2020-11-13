import { LovelaceDashboardStrategy } from "../../../data/lovelace";

const CUSTOM_PREFIX = "custom:";

const strategies = {
  default: import("./default-strategy"),
};

export const getLovelaceDashboardStrategy = (
  name: string
): Promise<LovelaceDashboardStrategy> => {
  if (name in strategies) {
    return strategies[name].generateDashboard();
  }

  if (!name.startsWith(CUSTOM_PREFIX)) {
    // This will just generate a view with a single error card
    // return errorStrategy(`Unknown strategy specified: ${name}`);
  }

  const tag = `ll-strategy-${name.substr(CUSTOM_PREFIX.length)}`;

  return customElements.whenDefined(tag).then(() => customElements.get(tag));
};

// To define a custom strategy
// customElements.define(
//   "ll-strategy-paulus",
//   class extends HTMLElement {
//     static async generateDashboard(info) {
//       return {
//         views: [
//           {
//             strategy: {
//               name: "custom:paulus",
//             },
//           },
//         ],
//       };
//     }

//     static async generateView(info) {
//       return {
//         cards: [],
//       };
//     }
//   }
// );
