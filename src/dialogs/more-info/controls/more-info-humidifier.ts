import { mdiPower, mdiTuneVariant } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity";
import {
  HumidifierEntity,
  HumidifierEntityFeature,
  computeHumidiferModeIcon,
} from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
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

    return html`
      <div class="current">
        ${this.stateObj.attributes.current_humidity != null
          ? html`
              <div>
                <p class="label">
                  ${this.hass.formatEntityAttributeName(
                    this.stateObj,
                    "current_humidity"
                  )}
                </p>
                <p class="value">
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj,
                    "current_humidity"
                  )}
                </p>
              </div>
            `
          : nothing}
      </div>

      <div class="controls">
        <ha-more-info-humidifier-humidity
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-more-info-humidifier-humidity>
      </div>

      <ha-more-info-control-select-container>
        <ha-control-select-menu
          .label=${this.hass.localize("ui.card.humidifier.state")}
          .value=${this.stateObj.state}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._handleStateChanged}
          @closed=${stopPropagation}
        >
          <ha-svg-icon slot="icon" .path=${mdiPower}></ha-svg-icon>
          <ha-list-item value="off">
            ${this.hass.formatEntityState(this.stateObj, "off")}
          </ha-list-item>
          <ha-list-item value="on">
            ${this.hass.formatEntityState(this.stateObj, "on")}
          </ha-list-item>
        </ha-control-select-menu>

        ${supportModes
          ? html`
              <ha-control-select-menu
                .label=${hass.localize("ui.card.humidifier.mode")}
                .value=${stateObj.attributes.mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleModeChanged}
                @closed=${stopPropagation}
              >
                <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
                ${stateObj.attributes.available_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-svg-icon
                        slot="graphic"
                        .path=${computeHumidiferModeIcon(mode)}
                      ></ha-svg-icon>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj!,
                        "mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
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
    this._mode = newVal;
    this._callServiceHelper(
      this.stateObj!.attributes.mode,
      newVal,
      "set_mode",
      {
        mode: newVal,
      }
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
