import { css, html } from "lit";
import { customElement } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import { normalizeSectionConfig } from "../../../src/data/lovelace/config/normalize";
import type { LovelaceSectionRawConfig } from "../../../src/data/lovelace/config/section";
import "../../../src/panels/lovelace/sections/hui-section";
import type { HomeAssistant } from "../../../src/types";
import { EmbedElement } from "./embed-element";
import type { ScriptObject } from "./script-data";
import { embedElementStyles } from "./theme-styles";

/**
 * Renders a dashboard section, or a section strategy, with the backend of a
 * provider, see `EmbedElement`. The section takes the width of the element.
 */
@customElement("ha-embed-section")
export class HaEmbedSection extends EmbedElement<LovelaceSectionRawConfig> {
  // A title becomes a heading card, as on a dashboard
  private _normalizedConfig = memoizeOne(normalizeSectionConfig);

  // A section has cards, sections inside it, or a strategy that makes them
  protected isConfig(data: ScriptObject): data is LovelaceSectionRawConfig {
    return "cards" in data || "sections" in data || "strategy" in data;
  }

  protected renderContent(hass: HomeAssistant) {
    if (!this.config) {
      return undefined;
    }

    return html`<hui-section
      .hass=${hass}
      .config=${this._normalizedConfig(this.config)}
      @section-visibility-changed=${this._visibilityChanged}
    ></hui-section>`;
  }

  private _visibilityChanged(
    ev: HASSDomEvent<HASSDomEvents["section-visibility-changed"]>
  ) {
    // Sections inside the section fire the same event
    if (ev.target !== ev.currentTarget) {
      return;
    }

    this.hidden = !ev.detail.value;
  }

  static styles = [
    embedElementStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-section": HaEmbedSection;
  }
}
