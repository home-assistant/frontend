import { mdiDevices } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";

@customElement("assist-current-device-pref")
export class AssistCurrentDevicePref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render() {
    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <ha-svg-icon .path=${mdiDevices} class="header-icon"></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.assistants.current_device.title"
          )}
        </h1>
        <div class="card-content">
          <p>
            ${this.hass.localize(
              "ui.panel.config.voice_assistants.assistants.current_device.description"
            )}
          </p>
        </div>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._openSettings}>
            ${this.hass.localize(
              "ui.panel.config.voice_assistants.assistants.current_device.open_settings"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _openSettings() {
    this.hass.auth.external!.fireMessage({
      type: "assist/settings",
    });
  }

  static styles = css`
    .card-header {
      display: flex;
      align-items: center;
    }
    .header-icon {
      height: 28px;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: initial;
    }
    .card-actions {
      display: flex;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-current-device-pref": AssistCurrentDevicePref;
  }
}
