import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";

import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";

import { ZWaveValue } from "../../../data/zwave";

@customElement("zwave-values")
export class ZwaveValues extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public values: ZWaveValue[] = [];
  @property() private _selectedValue: number = -1;

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass.localize("ui.panel.config.zwave.values.header")}
        >
          <div class="device-picker">
            <paper-dropdown-menu
              .label=${this.hass.localize("ui.panel.config.zwave.common.value")}
              dynamic-align
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this._selectedValue}
              >
                ${this.values.map(
                  (item) => html`
                    <paper-item>
                      ${this._computeCaption(item)}
                    </paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
        </ha-card>
      </div>
    `;
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

        .device-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 24px;
        }

        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }

        .help-text {
          padding-left: 24px;
          padding-right: 24px;
        }
      `,
    ];
  }

  private _computeCaption(item) {
    let out = `${item.value.label}`;
    out += ` (${this.hass.localize("ui.panel.config.zwave.common.instance")}:`;
    out += ` ${item.value.instance},`;
    out += ` ${this.hass.localize("ui.panel.config.zwave.common.index")}:`;
    out += ` ${item.value.index})`;
    return out;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-values": ZwaveValues;
  }
}
