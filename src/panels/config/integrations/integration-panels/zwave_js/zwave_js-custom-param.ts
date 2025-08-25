import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiCloseCircle } from "@mdi/js";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-select";
import "../../../../../components/ha-button";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-list-item";
import type { HomeAssistant } from "../../../../../types";
import {
  getZwaveNodeRawConfigParameter,
  setZwaveNodeRawConfigParameter,
} from "../../../../../data/zwave_js";
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("zwave_js-custom-param")
class ZWaveJSCustomParam extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceId!: string;

  @state() private _customParamNumber?: number;

  @state() private _valueSize = 1;

  @state() private _value?: number;

  @state() private _valueFormat = 0;

  @state() private _isLoading = false;

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
          <ha-list-item value="0"
            >${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.signed"
            )}</ha-list-item
          >
          <ha-list-item value="1"
            >${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.unsigned"
            )}</ha-list-item
          >
          <ha-list-item value="2"
            >${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.enumerated"
            )}</ha-list-item
          >
          <ha-list-item value="3"
            >${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.bitfield"
            )}</ha-list-item
          >
        </ha-select>
      </div>
      <div class="custom-config-buttons">
        ${this._isLoading ? html`<ha-spinner></ha-spinner>` : nothing}
        <ha-button appearance="plain" @click=${this._getCustomConfigValue}>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.get_value"
          )}
        </ha-button>
        <ha-button appearance="plain" @click=${this._setCustomConfigValue}>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.node_config.set_value"
          )}
        </ha-button>
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

  private _tryParseNumber(value: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  }

  private _customParamNumberChanged(ev: Event) {
    this._customParamNumber = this._tryParseNumber(
      (ev.target as HTMLInputElement).value
    );
  }

  private _customValueSizeChanged(ev: Event) {
    this._valueSize =
      this._tryParseNumber((ev.target as HTMLSelectElement).value) ?? 1;
  }

  private _customValueChanged(ev: Event) {
    this._value = this._tryParseNumber((ev.target as HTMLInputElement).value);
  }

  private _customValueFormatChanged(ev: Event) {
    this._valueFormat =
      this._tryParseNumber((ev.target as HTMLSelectElement).value) ?? 0;
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
    this._isLoading = true;
    try {
      const value = await getZwaveNodeRawConfigParameter(
        this.hass,
        this.deviceId,
        this._customParamNumber
      );
      this._value = value;
      fireEvent(this, "new-value", {
        property: this._customParamNumber,
        value: this._value,
      });
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._isLoading = false;
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
    this._isLoading = true;
    try {
      await setZwaveNodeRawConfigParameter(
        this.hass,
        this.deviceId,
        this._customParamNumber,
        this._value,
        this._valueSize,
        this._valueFormat
      );
      fireEvent(this, "new-value", {
        property: this._customParamNumber,
        value: this._value,
      });
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._isLoading = false;
    }
  }

  static styles = css`
    .custom-config-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 8px;
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

    .custom-config-buttons {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .error {
      color: var(--error-color);
    }

    .error-icon {
      margin-right: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-custom-param": ZWaveJSCustomParam;
  }
  interface HASSDomEvents {
    "new-value": {
      property: number;
      value: number;
    };
  }
}
