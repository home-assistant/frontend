import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@material/mwc-button/mwc-button";
import { mdiCloseCircle } from "@mdi/js";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import { HomeAssistant } from "../../../../../types";
import {
  getZwaveNodeRawConfigParameter,
  setZwaveNodeRawConfigParameter,
} from "../../../../../data/zwave_js";

@customElement("zwave_js-custom-param")
class ZWaveJSCustomParam extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public deviceId!: string;

  @state() private _customParamNumber?: number;

  @state() private _valueSize = 1;

  @state() private _value?: number;

  @state() private _valueFormat = 0;

  @state() private _error = "";

  protected render() {
    return html`
      <div class="custom-config-form">
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.parameter"
          )}
          .value=${this._customParamNumber ?? ""}
          @input=${this._customParamNumberChanged}
          type="number"
        ></ha-textfield>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.size"
          )}
          .value=${String(this._valueSize)}
          @selected=${this._customValueSizeChanged}
        >
          <ha-list-item value="1">1</ha-list-item>
          <ha-list-item value="2">2</ha-list-item>
          <ha-list-item value="4">4</ha-list-item>
        </ha-select>
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.value"
          )}
          .value=${this._value ?? ""}
          @input=${this._customValueChanged}
          type="number"
        ></ha-textfield>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.format"
          )}
          .value=${String(this._valueFormat)}
          @selected=${this._customValueFormatChanged}
        >
          <ha-list-item value="0">Signed</ha-list-item>
          <ha-list-item value="1">Unsigned</ha-list-item>
          <ha-list-item value="2">Enumerated</ha-list-item>
          <ha-list-item value="3">Bitfield</ha-list-item>
        </ha-select>
      </div>
      <div class="custom-config-buttons">
        <mwc-button @click=${this._getCustomConfigValue}>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.get_value"
          )}
        </mwc-button>
        <mwc-button @click=${this._setCustomConfigValue}>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.set_value"
          )}
        </mwc-button>
      </div>
      <div class="error">
        ${this._error
          ? html`<ha-svg-icon
                .path=${mdiCloseCircle}
                class="error-icon"
                slot="item-icon"
              ></ha-svg-icon
              ><em>${this._error}</em>`
          : nothing}
      </div>
    `;
  }

  private _customParamNumberChanged(ev: Event) {
    this._customParamNumber =
      Number((ev.target as HTMLInputElement).value) || undefined;
  }

  private _customValueSizeChanged(ev: Event) {
    this._valueSize = Number((ev.target as HTMLSelectElement).value) || 1;
  }

  private _customValueChanged(ev: Event) {
    this._value = Number((ev.target as HTMLInputElement).value) || undefined;
  }

  private _customValueFormatChanged(ev: Event) {
    this._valueFormat = Number((ev.target as HTMLSelectElement).value) || 0;
  }

  private async _getCustomConfigValue() {
    if (this._customParamNumber === undefined) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.node_config.error_required",
        {
          entity: this.hass.localize(
            "ui.panel.config.zwave_js.node_config.parameter"
          ),
        }
      );
      return;
    }
    this._error = "";
    try {
      const value = await getZwaveNodeRawConfigParameter(
        this.hass,
        this.deviceId,
        this._customParamNumber
      );
      this._value = value;
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    }
  }

  private async _setCustomConfigValue() {
    if (this._customParamNumber === undefined) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.node_config.error_required",
        {
          entity: this.hass.localize(
            "ui.panel.config.zwave_js.node_config.parameter"
          ),
        }
      );
      return;
    }
    if (this._value === undefined) {
      this._error = this.hass.localize(
        "ui.panel.config.zwave_js.node_config.error_required",
        {
          entity: this.hass.localize(
            "ui.panel.config.zwave_js.node_config.value"
          ),
        }
      );
      return;
    }
    this._error = "";
    try {
      await setZwaveNodeRawConfigParameter(
        this.hass,
        this.deviceId,
        this._customParamNumber,
        this._value,
        this._valueSize,
        this._valueFormat
      );
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      .custom-config-form {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 16px;
      }

      ha-textfield,
      ha-select {
        flex-grow: 1;
        flex-basis: calc(50% - 8px);
        min-width: 120px;
      }

      @media (min-width: 681px) {
        .custom-config-form {
          flex-wrap: nowrap;
        }

        ha-textfield,
        ha-select {
          flex-basis: 0;
        }
      }

      .error {
        color: var(--error-color);
      }

      .error-icon {
        margin-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-custom-param": ZWaveJSCustomParam;
  }
}
