import { mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-dropdown>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <a href="/config/application_credentials">
          <ha-dropdown-item>
            ${this.hass.localize(
              "ui.panel.config.application_credentials.caption"
            )}
          </ha-dropdown-item>
        </a>
      </ha-dropdown>
    `;
  }

  static styles = css`
    :host {
      display: flex;
    }
    a {
      text-decoration: none;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-overflow-menu": HaIntegrationOverflowMenu;
  }
}
