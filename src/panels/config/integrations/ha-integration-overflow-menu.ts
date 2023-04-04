import { mdiDotsVertical } from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button-menu";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";

@customElement("ha-integration-overflow-menu")
export class HaIntegrationOverflowMenu extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-button-menu activatable>
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-clickable-list-item href="/config/application_credentials">
          ${this.hass.localize(
            "ui.panel.config.application_credentials.caption"
          )}
        </ha-clickable-list-item>
      </ha-button-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-overflow-menu": HaIntegrationOverflowMenu;
  }
}
