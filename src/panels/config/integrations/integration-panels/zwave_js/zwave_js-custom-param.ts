import { LitElement, html, css, CSSResultGroup, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "@material/mwc-button/mwc-button";
import { mdiCloseCircle } from "@mdi/js";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import { HomeAssistant } from "../../../../../types";

@customElement("zwave_js-custom-param")
class ZWaveJSCustomParam extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public deviceId!: string;

  @state() private _customParamNumber = "";

  @state() private _valueSize = "0";

  @state() private _value = "";

  @state() private _valueFormat = "";

  @state() private _error = "";

  protected render() {
    return html`
      <div class="custom-config-form">
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.parameter"
          )}
          .value=${this._customParamNumber}
          @input=${this._customParamNumberChanged}
        ></ha-textfield>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.size"
          )}
          .value=${this._valueSize}
          @selected=${this._customValueSizeChanged}
        >
          <ha-list-item value="0"></ha-list-item>
          <ha-list-item value="1">1</ha-list-item>
          <ha-list-item value="2">2</ha-list-item>
          <ha-list-item value="4">4</ha-list-item>
        </ha-select>
        <ha-textfield
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.value"
          )}
          .value=${this._value}
          @input=${this._customValueChanged}
        ></ha-textfield>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.format"
          )}
          .value=${this._valueFormat}
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
    this._customParamNumber = (ev.target as HTMLInputElement).value;
  }

  private _customValueSizeChanged(ev: Event) {
    this._valueSize = (ev.target as HTMLSelectElement).value;
  }

  private _customValueChanged(ev: Event) {
    this._value = (ev.target as HTMLInputElement).value;
  }

  private _customValueFormatChanged(ev: Event) {
    this._valueFormat = (ev.target as HTMLSelectElement).value;
  }

  private async _getCustomConfigValue() {
    this._error = "";
    try {
      const { response } = await this.hass.callService(
        "zwave_js",
        "get_config_parameter",
        {
          device_id: this.deviceId,
          parameter: this._customParamNumber,
        }
      );
      this._value = response.value;
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    }
  }

  private async _setCustomConfigValue() {
    this._error = "";
    try {
      await this.hass.callService("zwave_js", "set_config_parameter", {
        device_id: this.deviceId,
        parameter: this._customParamNumber,
        value: this._value,
        value_size: Number(this._valueSize),
        value_format: this._valueFormat ? Number(this._valueFormat) : undefined,
      });
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
