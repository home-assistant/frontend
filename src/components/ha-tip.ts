import "@home-assistant/webawesome/dist/components/popup/popup";
import { mdiLightbulbOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../types";

import "./ha-svg-icon";

@customElement("ha-tip")
class HaTip extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  /**
   * When set, renders the tip inside a popup anchored to the given element
   * instead of inline. Does not steal focus.
   */
  @property({ attribute: false }) public popoverAnchor?: Element;

  public render() {
    if (!this.hass) {
      return nothing;
    }

    const content = html`
      <ha-svg-icon .path=${mdiLightbulbOutline}></ha-svg-icon>
      <span class="prefix"
        >${this.hass.localize("ui.panel.config.tips.tip")}</span
      >
      <span class="text"><slot></slot></span>
    `;

    if (this.popoverAnchor) {
      return html`
        <wa-popup
          active
          .anchor=${this.popoverAnchor}
          placement="top-start"
          distance="4"
          flip
          shift
        >
          <div class="popup-content">${content}</div>
        </wa-popup>
      `;
    }

    return content;
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
    }

    .text {
      direction: var(--direction);
      margin-left: 2px;
      margin-inline-start: 2px;
      margin-inline-end: initial;
      color: var(--secondary-text-color);
    }

    .prefix {
      font-weight: var(--ha-font-weight-medium);
    }

    .popup-content {
      padding: var(--ha-space-2) var(--ha-space-3);
      background: var(--card-background-color);
      border-radius: var(--ha-border-radius-xl);
      box-shadow: var(--wa-shadow-m);
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tip": HaTip;
  }
}
