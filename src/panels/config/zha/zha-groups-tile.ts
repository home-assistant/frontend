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
  customElement,
} from "lit-element";

import { navigate } from "../../../common/navigate";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

@customElement("zha-groups-tile")
export class ZHAGroupsTile extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public isWide?: boolean;
  @property() private _showHelp = false;

  protected render(): TemplateResult | void {
    return html`
      <ha-config-section .isWide="${this.isWide}">
        <div style="position: relative" slot="header">
          <span>
            ${this.hass!.localize(
              "ui.panel.config.zha.groups_management.header"
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
            "ui.panel.config.zha.groups_management.introduction"
          )}
        </span>

        <ha-card class="content">
          <div class="card-actions">
            <mwc-button @click=${this._onAddDevicesClick}>
              ${this.hass!.localize("ui.panel.config.zha.common.manage_groups")}
            </mwc-button>
          </div>
        </ha-card>
      </ha-config-section>
    `;
  }

  private _onHelpTap(): void {
    this._showHelp = !this._showHelp;
  }

  private _onAddDevicesClick() {
    navigate(this, "groups");
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
    "zha-groups-tile": ZHAGroupsTile;
  }
}
