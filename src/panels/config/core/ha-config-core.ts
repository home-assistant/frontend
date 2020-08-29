import {
  LitElement,
  CSSResult,
  css,
  TemplateResult,
  html,
  property,
  customElement,
} from "lit-element";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";

import "../../../layouts/hass-tabs-subpage";
import "./ha-config-section-core";

@customElement("ha-config-core")
export class HaConfigCore extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .tabs=${configSections.general}
        show-advanced=${this.showAdvanced}
      >
        <ha-config-section-core
          .isWide=${this.isWide}
          .narrow=${this.narrow}
          .showAdvanced=${this.showAdvanced}
          .hass=${this.hass}
        ></ha-config-section-core>
      </hass-tabs-subpage>
    `;
  }

  computeClasses(isWide) {
    return isWide ? "content" : "content narrow";
  }

  static get styles(): CSSResult {
    return css`
      ha-config-section-core {
        display: block;
        padding-bottom: 32px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-core": HaConfigCore;
  }
}
