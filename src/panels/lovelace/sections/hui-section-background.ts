import { css, LitElement, nothing, unsafeCSS } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  DEFAULT_SECTION_BACKGROUND_OPACITY,
  resolveSectionBackground,
  type LovelaceSectionBackgroundConfig,
} from "../../../data/lovelace/config/section";
import type { HomeAssistant } from "../../../types";

@customElement("hui-section-background")
export class HuiSectionBackground extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @property({ attribute: false })
  public background?: boolean | LovelaceSectionBackgroundConfig;

  @property({ attribute: false })
  public theme?: string;

  protected render() {
    return nothing;
  }

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("background")) {
      const resolved = resolveSectionBackground(this.background);
      if (resolved) {
        const color = resolved.color ? computeCssColor(resolved.color) : null;
        this.style.setProperty("--section-background-color", color);
        const opacity =
          resolved.opacity !== undefined ? `${resolved.opacity}%` : null;
        this.style.setProperty("--section-background-opacity", opacity);
      }
    }
    if (!this.hass) {
      return;
    }
    const oldHass = changedProperties.get("hass");
    if (
      changedProperties.has("theme") ||
      !oldHass ||
      this.hass.themes !== oldHass.themes ||
      this.hass.selectedTheme !== oldHass.selectedTheme
    ) {
      applyThemesOnElement(this, this.hass.themes, this.theme);
    }
  }

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background-color: var(
        --section-background-color,
        var(--ha-section-background-color, var(--secondary-background-color))
      );
      opacity: var(
        --section-background-opacity,
        ${unsafeCSS(DEFAULT_SECTION_BACKGROUND_OPACITY)}%
      );
      z-index: 0;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-background": HuiSectionBackground;
  }
}
