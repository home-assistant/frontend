import { ReactiveElement } from "lit";
import { isStrategySection } from "../../../../src/data/lovelace/config/section";
import type { LovelaceConfig } from "../../../../src/data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../../src/data/lovelace/config/view";
import { isStrategyView } from "../../../../src/data/lovelace/config/view";
import type { HomeDashboardStrategyConfig } from "../../../../src/panels/lovelace/strategies/home/home-dashboard-strategy";
import { HomeDashboardStrategy } from "../../../../src/panels/lovelace/strategies/home/home-dashboard-strategy";
import type { HomeOverviewViewStrategyConfig } from "../../../../src/panels/lovelace/strategies/home/home-overview-view-strategy";
import { HomeOverviewViewStrategy } from "../../../../src/panels/lovelace/strategies/home/home-overview-view-strategy";
import type { HeadingCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type { HomeAssistant } from "../../../../src/types";

export interface DemoHomeDashboardStrategyConfig extends Omit<
  HomeDashboardStrategyConfig,
  "type"
> {
  type: "custom:demo-home";
}

interface DemoHomeOverviewViewStrategyConfig extends Omit<
  HomeOverviewViewStrategyConfig,
  "type"
> {
  type: "custom:demo-home-overview";
}

class DemoHomeDashboardStrategy extends ReactiveElement {
  static registryDependencies = HomeDashboardStrategy.registryDependencies;

  static async generate(
    config: DemoHomeDashboardStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceConfig> {
    const generated = await HomeDashboardStrategy.generate(
      { ...config, type: "home" },
      hass
    );
    // Swap the overview view for the demo version, which adds the demo card.
    return {
      ...generated,
      views: generated.views.map((view) =>
        isStrategyView(view) && view.strategy.type === "home-overview"
          ? {
              ...view,
              strategy: { ...view.strategy, type: "custom:demo-home-overview" },
            }
          : view
      ),
    };
  }
}

class DemoHomeOverviewViewStrategy extends ReactiveElement {
  static registryDependencies = HomeOverviewViewStrategy.registryDependencies;

  static async generate(
    config: DemoHomeOverviewViewStrategyConfig,
    hass: HomeAssistant
  ): Promise<LovelaceViewConfig> {
    const view = await HomeOverviewViewStrategy.generate(
      { ...config, type: "home-overview" },
      hass
    );
    // Add the demo card to the favorites section, found by its heading
    const favoritesHeading = hass.localize(
      "ui.panel.lovelace.strategy.home.favorites"
    );
    const sections = (view.sections || []).map((section) => {
      if (
        isStrategySection(section) ||
        !section.cards?.some(
          (card) =>
            card.type === "heading" &&
            (card as HeadingCardConfig).heading === favoritesHeading
        )
      ) {
        return section;
      }
      const [heading, ...cards] = section.cards;
      return {
        ...section,
        // Place the demo card first so the tiles fill the rows next to it. It
        // takes up the space of two tiles, so keep two less, but at least six.
        cards: [
          heading,
          { type: "custom:ha-demo-next-card" },
          ...cards.slice(0, Math.max(6, cards.length - 2)),
        ],
      };
    });

    return {
      ...view,
      sections: sections,
    };
  }
}

customElements.define(
  "ll-strategy-dashboard-demo-home",
  DemoHomeDashboardStrategy
);
customElements.define(
  "ll-strategy-view-demo-home-overview",
  DemoHomeOverviewViewStrategy
);

declare global {
  interface HTMLElementTagNameMap {
    "ll-strategy-dashboard-demo-home": DemoHomeDashboardStrategy;
    "ll-strategy-view-demo-home-overview": DemoHomeOverviewViewStrategy;
  }
}
