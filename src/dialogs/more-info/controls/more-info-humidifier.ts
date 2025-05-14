import { mdiPower, mdiTuneVariant } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-attribute-icon";
import { UNAVAILABLE } from "../../../data/entity";
import type { HumidifierEntity } from "../../../data/humidifier";
import { HumidifierEntityFeature } from "../../../data/humidifier";
import "../../../state-control/humidifier/ha-state-control-humidifier-humidity";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import { moreInfoControlStyle } from "../components/more-info-control-style";

class MoreInfoHumidifier extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HumidifierEntity;

  @state() public _mode?: string;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("stateObj")) {
      this._mode = this.stateObj?.attributes.mode;
    }
  }

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
        <ha-state-control-humidifier-humidity
          .hass=${this.hass}
          .stateObj=${this.stateObj}
        ></ha-state-control-humidifier-humidity>
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
                ${stateObj.attributes.mode
                  ? html`
                      <ha-attribute-icon
                        slot="icon"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="mode"
                        .attributeValue=${stateObj.attributes.mode}
                      ></ha-attribute-icon>
                    `
                  : html`
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiTuneVariant}
                      ></ha-svg-icon>
                    `}
                ${stateObj.attributes.available_modes!.map(
                  (mode) => html`
                    <ha-list-item .value=${mode} graphic="icon">
                      <ha-attribute-icon
                        slot="graphic"
                        .hass=${this.hass}
                        .stateObj=${stateObj}
                        attribute="mode"
                        .attributeValue=${mode}
                      ></ha-attribute-icon>
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
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-condensed);
          letter-spacing: 0.4px;
          margin-bottom: 4px;
        }
        .current .value {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
          direction: ltr;
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
