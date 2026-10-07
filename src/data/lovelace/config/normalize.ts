import type { LovelaceBadgeConfig } from "./badge";
import { ensureBadgeConfig } from "./badge";
import type { LovelaceSectionRawConfig } from "./section";
import { isStrategySection } from "./section";
import type { LovelaceRawConfig } from "./types";
import { isStrategyDashboard } from "./types";
import type { LovelaceViewConfig } from "./view";
import { isStrategyView } from "./view";

export const normalizeLovelaceConfig = (
  config: LovelaceRawConfig
): LovelaceRawConfig => {
  if (isStrategyDashboard(config)) {
    return config;
  }

  const updatedConfig = { ...config };

  if (updatedConfig.views) {
    updatedConfig.views = updatedConfig.views
      .filter(Boolean)
      .map((view) => (isStrategyView(view) ? view : normalizeViewConfig(view)));
  }

  return updatedConfig;
};

export const normalizeViewConfig = (
  view: LovelaceViewConfig
): LovelaceViewConfig => {
  const updatedView = { ...view };

  // Remove empty badges and expand the entity id shorthand
  if (updatedView.badges) {
    const badges = updatedView.badges as (
      Partial<LovelaceBadgeConfig> | string
    )[];
    updatedView.badges = badges.filter(Boolean).map(ensureBadgeConfig);
  }

  if (updatedView.cards) {
    updatedView.cards = updatedView.cards.filter(Boolean);
  }

  // Migrate sections
  if (updatedView.sections) {
    updatedView.sections = updatedView.sections
      .filter(Boolean)
      .map(normalizeSectionConfig);
  }

  return updatedView;
};

export const normalizeSectionConfig = (
  section: LovelaceSectionRawConfig
): LovelaceSectionRawConfig => {
  const updatedSection = { ...section };

  // Move title to a heading card
  if (section.title) {
    // Only add card if it's not a strategy section
    if (!isStrategySection(updatedSection)) {
      const card = { type: "heading", heading: updatedSection.title };
      updatedSection.cards = [card, ...(updatedSection.cards || [])];
    }

    delete updatedSection.title;
  }

  if (!isStrategySection(updatedSection) && updatedSection.cards) {
    updatedSection.cards = updatedSection.cards.filter(Boolean);
  }

  return updatedSection;
};
