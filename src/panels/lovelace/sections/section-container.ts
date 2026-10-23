import { css, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map";
import {
  hasSectionBackground,
  type LovelaceBaseSectionConfig,
} from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";
import "./hui-section-background";

// The background of a section is drawn by its container, not by the section.
export const renderSectionContainer = (
  hass: HomeAssistant,
  config: LovelaceBaseSectionConfig,
  section: unknown,
  alignBackground = false
) => {
  const hasBackground = hasSectionBackground(config);

  return html`
    <div
      class="section-container ${classMap({
        "has-background": hasBackground,
        "align-background": alignBackground,
      })}"
    >
      ${
        hasBackground
          ? html`<hui-section-background
              .hass=${hass}
              .background=${config.background}
              .theme=${config.theme}
            ></hui-section-background>`
          : nothing
      }
      ${section}
    </div>
  `;
};

export const sectionContainerStyles = css`
  .section-container {
    position: relative;
  }

  .section-container:has(> hui-section[hidden]) {
    display: none;
  }

  .section-container.has-background {
    padding: var(--ha-space-2);
    border-radius: var(--ha-section-border-radius, var(--ha-border-radius-xl));
  }

  .section-container.align-background {
    margin-top: var(--ha-space-2);
    margin-bottom: var(--ha-space-2);
  }
`;
