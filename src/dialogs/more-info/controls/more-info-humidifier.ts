import { mdiPower, mdiTuneVariant } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HumidifierEntity } from "../../../data/humidifier";
import { HumidifierEntityFeature } from "../../../data/humidifier";
import "../../../state-control/humidifier/ha-state-control-humidifier-humidity";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-control-select-container";
import { moreInfoControlStyle } from "../components/more-info-control-style";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("more-info-humidifier")
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
          .hass=${hass}
          .label=${this.hass.localize("ui.card.humidifier.state")}
          .value=${this.stateObj.state}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          @wa-select=${this._handleStateChanged}
          .options=${["off", "on"].map((fanState) => ({
            value: fanState,
            label: this.stateObj
              ? this.hass.formatEntityState(this.stateObj, fanState)
              : fanState,
          }))}
        >
          <ha-svg-icon slot="icon" .path=${mdiPower}></ha-svg-icon>
        </ha-control-select-menu>

        ${supportModes
          ? html`
              <ha-control-select-menu
                .hass=${hass}
                .label=${hass.localize("ui.card.humidifier.mode")}
                .value=${stateObj.attributes.mode}
                .disabled=${this.stateObj.state === UNAVAILABLE}
                @wa-select=${this._handleModeChanged}
                .options=${stateObj.attributes.available_modes?.map((mode) => ({
                  value: mode,
                  label: stateObj
                    ? this.hass.formatEntityAttributeValue(
                        stateObj,
                        "mode",
                        mode
                      )
                    : mode,
                  attributeIcon: stateObj
                    ? {
                        stateObj,
                        attribute: "mode",
                        attributeValue: mode,
                      }
                    : undefined,
                })) || []}
              >
                <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
              </ha-control-select-menu>
            `
          : nothing}
      </ha-more-info-control-select-container>
    `;
  }

  private _handleStateChanged(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value || null;
    this._callServiceHelper(
      this.stateObj!.state,
      newVal,
      newVal === "on" ? "turn_on" : "turn_off",
      {}
    );
  }

  private _handleModeChanged(ev: HaDropdownSelectEvent) {
    const newVal = ev.detail.item.value;
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
          margin-bottom: var(--ha-space-10);
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
          margin-bottom: var(--ha-space-1);
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

declare global {
  interface HTMLElementTagNameMap {
    "more-info-humidifier": MoreInfoHumidifier;
  }
}
