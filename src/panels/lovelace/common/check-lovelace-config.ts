import type {
  LovelaceSectionConfig,
  LovelaceSectionRawConfig,
} from "../../../data/lovelace/config/section";
import { isStrategySection } from "../../../data/lovelace/config/section";
import type { LovelaceRawConfig } from "../../../data/lovelace/config/types";
import { isStrategyDashboard } from "../../../data/lovelace/config/types";
import type { LovelaceViewRawConfig } from "../../../data/lovelace/config/view";
import { isStrategyView } from "../../../data/lovelace/config/view";
import { SECTIONS_VIEW_LAYOUT } from "../views/const";
import { getViewType } from "../views/get-view-type";

export const checkLovelaceConfig = (
  config: LovelaceRawConfig
): LovelaceRawConfig => {
  if (isStrategyDashboard(config)) {
    return config;
  }

  const updatedConfig = { ...config };

  if (updatedConfig.views) {
    updatedConfig.views = updatedConfig.views.map(checkViewConfig);
  }

  return updatedConfig;
};

export const checkViewConfig = (
  view: LovelaceViewRawConfig
): LovelaceViewRawConfig => {
  if (isStrategyView(view)) {
    return view;
  }

  const updatedView = { ...view };

  // Remove empty badges
  if (updatedView.badges && !updatedView.badges.every(Boolean)) {
    updatedView.badges = updatedView.badges!.filter(Boolean);
  }

  // Migrate sections
  if (updatedView.sections) {
    updatedView.sections = updatedView.sections!.map(checkSectionConfig);
  }

  const type = getViewType(updatedView);

  if (type === SECTIONS_VIEW_LAYOUT && updatedView.badges) {
    const headingSection: LovelaceSectionConfig = {
      type: "heading",
      badges: updatedView.badges || [],
      layout: "center",
    };
    const existingSections = updatedView.sections || [];
    updatedView.sections = [headingSection, ...existingSections];
    delete updatedView.badges;
  }

  return updatedView;
};

export const checkSectionConfig = (
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
  return updatedSection;
};
