import { css, html, nothing } from "lit";
import { classMap } from "lit/directives/class-map";
import type { HomeAssistant } from "../../../types";
import type { HuiSection } from "./hui-section";
import "./hui-section-background";

export const renderSection = (
  hass: HomeAssistant,
  section: HuiSection,
  alignBackground = false
) => {
  const hasBackground = section.config.background !== undefined;

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
              .background=${section.config.background}
              .theme=${section.config.theme}
            ></hui-section-background>`
          : nothing
      }
      ${section}
    </div>
  `;
};

export const sectionStyles = css`
  .section:has(> .section-container > hui-section[hidden]) {
    display: none;
  }

  .section-container {
    position: relative;
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
