import { mdiPower } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../../../common/entity/compute_attribute_display";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatNumber } from "../../../common/number/format_number";
import { blankBeforePercent } from "../../../common/translations/blank_before_percent";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import {
  HumidifierEntity,
  HumidifierEntityFeature,
} from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { moreInfoControlStyle } from "../components/ha-more-info-control-style";
import "../components/humidifier/ha-more-info-humidifier-humidity";

class MoreInfoHumidifier extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HumidifierEntity;

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
        ? html`
            <div class="current">
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
            </div>
          `
        : html`<span></span>`}
      <div class="controls">
        <ha-more-info-humidifier-humidity
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-humidifier-humidity>
        <ha-icon-button-group>
          <ha-icon-button
            .disabled=${this.stateObj!.state === UNAVAILABLE}
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.humidifier.toggle"
            )}
            @click=${this._toggle}
          >
            <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
          </ha-icon-button>
        </ha-icon-button-group>
      </div>
      <div
        class=${classMap({
          "has-modes": supportModes,
        })}
      >
        <ha-select
          .label=${hass.localize("ui.card.humidifier.state")}
          .value=${stateObj.state}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._handleStateChanged}
          @closed=${stopPropagation}
        >
          <mwc-list-item value="off">
            ${computeStateDisplay(
              hass.localize,
              stateObj,
              hass.locale,
              this.hass.config,
              hass.entities,
              "off"
            )}
          </mwc-list-item>
          <mwc-list-item value="on">
            ${computeStateDisplay(
              hass.localize,
              stateObj,
              hass.locale,
              this.hass.config,
              hass.entities,
              "on"
            )}
          </mwc-list-item>
        </ha-select>

        ${supportModes
          ? html`
              <ha-select
                .label=${computeAttributeNameDisplay(
                  hass.localize,
                  stateObj,
                  hass.entities,
                  "mode"
                )}
                .value=${stateObj.attributes.mode}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.available_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode}>
                      ${computeAttributeValueDisplay(
                        hass.localize,
                        stateObj,
                        hass.locale,
                        this.hass.config,
                        hass.entities,
                        "mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-select>
            `
          : ""}
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

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        :host {
          color: var(--primary-text-color);
        }

        <<<<<<< HEAD ha-select {
          width: 100%;
          margin-top: 8px;
        }

        ha-slider {
          width: 100%;
        }
        ======= .current {
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
          font-size: 12px;
          line-height: 16px;
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }
        .current .value {
          font-size: 22px;
          font-weight: 500;
          line-height: 28px;
        }
        >>>>>>>b3948aa8a
          (Add new humidity control in humidifier more info)
          ha-select {
          width: 100%;
        }

        .single-row {
          padding: 8px 0;
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
