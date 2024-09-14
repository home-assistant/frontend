import { mdiDotsVertical } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button-menu-new";
import "../../../components/ha-menu-item";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-button-menu-new>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-menu-item href="/config/application_credentials">
          ${this.hass.localize(
            "ui.panel.config.application_credentials.caption"
          )}
        </ha-menu-item>
      </ha-button-menu-new>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-overflow-menu": HaIntegrationOverflowMenu;
  }
}
