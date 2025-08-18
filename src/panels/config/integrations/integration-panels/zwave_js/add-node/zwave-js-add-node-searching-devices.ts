import "@awesome.me/webawesome/dist/components/animation/animation";
import { mdiRestart } from "@mdi/js";

import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import type { HomeAssistant } from "../../../../../../types";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import { InclusionStrategy } from "../../../../../../data/zwave_js";

import "../../../../../../components/ha-spinner";
import "../../../../../../components/ha-button";
import "../../../../../../components/ha-alert";
import { WakeLockMixin } from "../../../../../../mixins/wakelock-mixin";

@customElement("zwave-js-add-node-searching-devices")
export class ZWaveJsAddNodeSearchingDevices extends WakeLockMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "smart-start" })
  public smartStart = false;

  @property({ type: Boolean, attribute: "show-security-options" })
  public showSecurityOptions = false;

  @property({ type: Boolean, attribute: "show-add-another-device" })
  public showAddAnotherDevice = false;

  @property({ attribute: false }) public inclusionStrategy?: InclusionStrategy;

  render() {
    let inclusionStrategyTranslationKey = "";
    if (this.inclusionStrategy !== undefined) {
      switch (this.inclusionStrategy) {
        case InclusionStrategy.Security_S0:
          inclusionStrategyTranslationKey = "s0";
          break;
        case InclusionStrategy.Insecure:
          inclusionStrategyTranslationKey = "insecure";
          break;
        default:
          inclusionStrategyTranslationKey = "default";
      }
    }

    return html`
      <div class="searching-devices">
        <div class="searching-spinner">
          <div class="spinner">
            <ha-spinner></ha-spinner>
          </div>
          <wa-animation name="pulse" easing="linear" .duration=${2000} play>
            <div class="circle"></div>
          </wa-animation>
        </div>
        ${this.smartStart
          ? html`<ha-alert
                .title=${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.turn_on_device"
                )}
              >
                <ha-svg-icon slot="icon" .path=${mdiRestart}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.turn_on_device_description"
                )}
              </ha-alert>
              <p class="note">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.specific_device.close_description"
                )}
              </p>`
          : html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                )}
              </p>
            `}
        ${this.showSecurityOptions && !inclusionStrategyTranslationKey
          ? html`<ha-button @click=${this._handleSecurityOptions}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.add_node.security_options"
              )}
            </ha-button>`
          : inclusionStrategyTranslationKey
            ? html`<span class="note">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.select_strategy.inclusion_strategy",
                  {
                    strategy: this.hass.localize(
                      `ui.panel.config.zwave_js.add_node.select_strategy.${inclusionStrategyTranslationKey}_label`
                    ),
                  }
                )}
              </span>`
            : nothing}
        ${this.showAddAnotherDevice
          ? html`<ha-button @click=${this._handleAddAnotherDevice}>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.add_node.specific_device.add_another_z_wave_device"
              )}
            </ha-button>`
          : nothing}
      </div>
    `;
  }

  private _handleSecurityOptions() {
    fireEvent(this, "show-z-wave-security-options");
  }

  private _handleAddAnotherDevice() {
    fireEvent(this, "add-another-z-wave-device");
  }

  static styles = css`
    :host {
      text-align: center;
      display: block;
    }
    ha-alert {
      margin-top: 32px;
      display: block;
    }
    .note {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }
    .searching-spinner {
      margin-left: auto;
      margin-right: auto;
      position: relative;
      width: 128px;
      height: 128px;
    }
    .searching-spinner .circle {
      border-radius: 50%;
      background-color: var(--light-primary-color);
      position: absolute;
      width: calc(100% - 32px);
      height: calc(100% - 32px);
      margin: 16px;
    }
    .searching-spinner .spinner {
      z-index: 1;
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      --ha-spinner-divider-color: var(--light-primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-searching-devices": ZWaveJsAddNodeSearchingDevices;
  }

  interface HASSDomEvents {
    "show-z-wave-security-options": undefined;
    "add-another-z-wave-device": undefined;
  }
}
