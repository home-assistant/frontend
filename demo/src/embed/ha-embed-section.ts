import type { PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../src/common/dom/fire_event";
import { normalizeSectionConfig } from "../../../src/data/lovelace/config/normalize";
import type { LovelaceSectionRawConfig } from "../../../src/data/lovelace/config/section";
import "../../../src/panels/lovelace/sections/hui-section";
import {
  renderSectionContainer,
  sectionContainerStyles,
} from "../../../src/panels/lovelace/sections/section-container";
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

  // A section has cards, sections inside it, a strategy that makes them, a
  // title, or the type of a custom section
  protected isConfig(data: ScriptObject): data is LovelaceSectionRawConfig {
    return (
      "cards" in data ||
      "sections" in data ||
      "strategy" in data ||
      "title" in data ||
      ("type" in data && typeof data.type === "string")
    );
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    // The section that hid the element is gone, and the next one starts
    // visible without telling it
    if (changedProps.has("config") && !this.config) {
      this.hidden = false;
    }
  }

  // In the container that draws the background of the section, as in a
  // sections view
  protected renderContent(hass: HomeAssistant) {
    if (!this.config) {
      return undefined;
    }

    const config = this._normalizedConfig(this.config);

    return renderSectionContainer(
      hass,
      config,
      html`<hui-section
        .hass=${hass}
        .config=${config}
        @section-visibility-changed=${this._visibilityChanged}
      ></hui-section>`
    );
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
    sectionContainerStyles,
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
