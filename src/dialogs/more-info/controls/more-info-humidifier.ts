import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-select";
import "../../../components/ha-slider";
import "../../../components/ha-switch";
import {
  HumidifierEntity,
  HUMIDIFIER_SUPPORT_MODES,
} from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";

class MoreInfoHumidifier extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HumidifierEntity;

  private _resizeDebounce?: number;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const hass = this.hass;
    const stateObj = this.stateObj;

    const supportModes = supportsFeature(stateObj, HUMIDIFIER_SUPPORT_MODES);

    const rtlDirection = computeRTLDirection(hass);

    return html`
      <div
        class=${classMap({
          "has-modes": supportModes,
        })}
      >
        <div class="container-humidity">
          <div>${hass.localize("ui.card.humidifier.humidity")}</div>
          <div class="single-row">
            <div class="target-humidity">${stateObj.attributes.humidity} %</div>
            <ha-slider
              step="1"
              pin
              ignore-bar-touch
              dir=${rtlDirection}
              .min=${stateObj.attributes.min_humidity}
              .max=${stateObj.attributes.max_humidity}
              .value=${stateObj.attributes.humidity}
              @change=${this._targetHumiditySliderChanged}
            >
            </ha-slider>
          </div>
        </div>

        ${supportModes
          ? html`
              <ha-select
                .label=${hass.localize("ui.card.humidifier.mode")}
                .value=${stateObj.attributes.mode}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.available_modes!.map(
                  (mode) => html`
                    <mwc-list-item .value=${mode}>
                      ${hass.localize(
                        `state_attributes.humidifier.mode.${mode}`
                      ) || mode}
                    </mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }

    if (this._resizeDebounce) {
      clearTimeout(this._resizeDebounce);
    }
    this._resizeDebounce = window.setTimeout(() => {
      fireEvent(this, "iron-resize");
      this._resizeDebounce = undefined;
    }, 500);
  }

  private _targetHumiditySliderChanged(ev) {
    const newVal = ev.target.value;
    this._callServiceHelper(
      this.stateObj!.attributes.humidity,
      newVal,
      "set_humidity",
      { humidity: newVal }
    );
  }

  private _handleModeChanged(ev) {
    const newVal = ev.target.value || null;
    this._callServiceHelper(
      this.stateObj!.attributes.mode,
      newVal,
      "set_mode",
      { mode: newVal }
    );
  }

  private async _callServiceHelper(
    oldVal: unknown,
    newVal: unknown,
    service: string,
    data: {
      entity_id?: string;
      [key: string]: unknown;
    }
  ) {
    if (oldVal === newVal) {
      return;
    }

    data.entity_id = this.stateObj!.entity_id;
    const curState = this.stateObj;

    await this.hass.callService("humidifier", service, data);

    // We reset stateObj to re-sync the inputs with the state. It will be out
    // of sync if our service call did not result in the entity to be turned
    // on. Since the state is not changing, the resync is not called automatic.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // No need to resync if we received a new state.
    if (this.stateObj !== curState) {
      return;
    }

    this.stateObj = undefined;
    await this.updateComplete;
    // Only restore if not set yet by a state change
    if (this.stateObj === undefined) {
      this.stateObj = curState;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        color: var(--primary-text-color);
      }

      ha-select {
        width: 100%;
      }

      .container-humidity .single-row {
        display: flex;
        height: 50px;
      }

      .target-humidity {
        width: 90px;
        font-size: 200%;
        margin: auto;
        direction: ltr;
      }

      .single-row {
        padding: 8px 0;
      }
    `;
  }
}

customElements.define("more-info-humidifier", MoreInfoHumidifier);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-humidifier": MoreInfoHumidifier;
  }
}
