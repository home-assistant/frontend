import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../../../components/ha-card";
import "../ha-config-section";
import "@material/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";

import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  property,
} from "lit-element";

import { navigate } from "../../../common/navigate";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

export class ZHANetwork extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _showHelp = false;

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div style="position: relative" slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zha.network_management.header"
            )}
          </span>
          <paper-icon-button
            class="toggle-help-icon"
            @click="${this._onHelpTap}"
            icon="hass:help-circle"
          ></paper-icon-button>
        </div>
        <span slot="introduction">
          ${this.hass!.localize(
            "ui.panel.config.zha.network_management.introduction"
          )}
        </span>

        <ha-card class="content">
          <div class="card-actions">
            <mwc-button @click=${this._onAddDevicesClick}>
              ${this.hass!.localize("ui.panel.config.zha.common.add_devices")}
            </mwc-button>
            ${this._showHelp
              ? html`
                  <ha-service-description
                    .hass="${this.hass}"
                    domain="zha"
                    service="permit"
                    class="help-text2"
                  />
                `
              : ""}
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _onAddDevicesClick() {
    navigate(this, "add");
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .content {
          margin-top: 24px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }

        .help-text2 {
          color: grey;
          padding: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network": ZHANetwork;
  }
}

customElements.define("zha-network", ZHANetwork);
