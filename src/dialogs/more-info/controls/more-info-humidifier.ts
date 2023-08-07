import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatNumber } from "../../../common/number/format_number";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import { forwardHaptic } from "../../../data/haptics";
import {
  HumidifierEntity,
  HumidifierEntityFeature,
} from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/humidifier/ha-more-info-humidifier-humidity";

class MoreInfoHumidifier extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HumidifierEntity;

  @state() public _mode?: string;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._mode = this.stateObj?.attributes.mode;
    }
  }

  private _resizeDebounce?: number;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const hass = this.hass;
    const stateObj = this.stateObj;

    const supportModes = supportsFeature(
      stateObj,
      HumidifierEntityFeature.MODES
    );

    const currentHumidity = this.stateObj.attributes.current_humidity;

    return html`
      ${currentHumidity
        ? html` <div class="current">
            ${currentHumidity != null
              ? html`
                  <div>
                    <p class="label">
                      ${computeAttributeNameDisplay(
                        this.hass.localize,
                        this.stateObj,
                        this.hass.entities,
                        "current_humidity"
                      )}
                    </p>
                    <p class="value">
                      ${formatNumber(
                        currentHumidity,
                        this.hass.locale
                      )}${blankBeforePercent(this.hass.locale)}%
                    </p>
                  </div>
                `
              : nothing}
          </div>`
        : nothing}
      <div class="controls">
        <ha-more-info-humidifier-humidity
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-humidifier-humidity>
      </div>
      <div
        class=${classMap({
          "has-modes": supportModes,
        })}
      >
        <ha-select
          .label=${this.hass.localize("ui.card.humidifier.state")}
          .value=${this.stateObj.state}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._handleStateChanged}
          @closed=${stopPropagation}
        >
          <mwc-list-item value="off">
            ${computeStateDisplay(
              this.hass.localize,
              this.stateObj,
              this.hass.locale,
              this.hass.config,
              this.hass.entities,
              "off"
            )}
          </mwc-list-item>
          <mwc-list-item value="on">
            ${computeStateDisplay(
              this.hass.localize,
              this.stateObj,
              this.hass.locale,
              this.hass.config,
              this.hass.entities,
              "on"
            )}
          </mwc-list-item>
        </ha-select>

        ${supportModes
          ? html`
              <ha-select
                .label=${hass.localize("ui.card.humidifier.mode")}
                .value=${stateObj.attributes.mode}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleModeChanged}
                @action=${this._handleModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.available_modes!.map(
                  (mode) => html`
                    <mwc-list-item .value=${mode}>
                      ${computeAttributeValueDisplay(
                        hass.localize,
                        stateObj!,
                        hass.locale,
                        hass.config,
                        hass.entities,
                        "mode",
                        mode
                      )}
                    </mwc-list-item>
                  `
                )}
              </ha-select>
            `
          : nothing}
      </div>
    `;
  }

  private _toggle = () => {
    const service = this.stateObj?.state === "on" ? "turn_off" : "turn_on";
    forwardHaptic("light");
    this.hass.callService("humidifier", service, {
      entity_id: this.stateObj!.entity_id,
    });
  };

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

  private _handleStateChanged(ev) {
    const newVal = ev.target.value || null;
    this._callServiceHelper(
      this.stateObj!.state,
      newVal,
      newVal === "on" ? "turn_on" : "turn_off",
      {}
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
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

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

  private _handleModeChanged(ev) {
    ev.stopPropagation();
    ev.preventDefault();

    const index = ev.detail.index;
    const newVal = this.stateObj!.attributes.available_modes![index];
    const oldVal = this._mode;

    if (!newVal || oldVal === newVal) return;

    this._mode = newVal;
    this.hass.callService("humidifier", "set_mode", {
      entity_id: this.stateObj!.entity_id,
      mode: newVal,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }

        .current {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-bottom: 40px;
        }
        .current div {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
        }
        .current p {
          margin: 0;
          text-align: center;
          color: var(--primary-text-color);
        }
        .current .label {
          opacity: 0.8;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }
        .current .value {
          font-size: 22px;
          font-weight: 500;
          line-height: 28px;
        }

        ha-select {
          width: 100%;
          margin-top: 8px;
        }
      `,
    ];
  }
}

customElements.define("more-info-humidifier", MoreInfoHumidifier);

declare global {
  interface HTMLElementTagNameMap {
    "more-info-humidifier": MoreInfoHumidifier;
  }
}
