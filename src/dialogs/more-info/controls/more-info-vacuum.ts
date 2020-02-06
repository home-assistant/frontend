import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-attributes";

import { supportsFeature } from "../../../common/entity/supports-feature";
import { HomeAssistant } from "../../../types";

import { HassEntity } from "home-assistant-js-websocket";

@customElement("more-info-vacuum")
class MoreInfoVacuum extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    const supportsPause = supportsFeature(stateObj, 4);
    const supportsStop = supportsFeature(stateObj, 8);
    const supportsReturnHome = supportsFeature(stateObj, 16);
    const supportsFanSpeed = supportsFeature(stateObj, 32);
    const supportsBattery = supportsFeature(stateObj, 64);
    const supportsStatus = supportsFeature(stateObj, 128);
    const supportsLocate = supportsFeature(stateObj, 512);
    const supportsCleanSpot = supportsFeature(stateObj, 1024);
    const supportsStart = supportsFeature(stateObj, 8192);

    const filterExtraAtrributes =
      "fan_speed,fan_speed_list,status,battery_level,battery_icon";

    const supportsCommandBar =
      supportsPause ||
      supportsStop ||
      supportsReturnHome ||
      supportsLocate ||
      supportsCleanSpot ||
      supportsStart;

    return html`
      <div class="flex-horizontal">
        ${supportsStatus
          ? html`
              <div>
                <span class="status-subtitle">Status: </span>
                <span><strong>${stateObj.attributes.status}</strong></span>
              </div>
            `
          : ""}
        ${supportsBattery
          ? html`
              <div">
                <span>
                  <iron-icon icon="${stateObj.attributes.battery_icon}"></iron-icon>
                  ${stateObj.attributes.battery_level} %
                  </span>
              </div>`
          : ""}
      </div>

      ${supportsCommandBar
        ? html`
            <div>
              <p></p>
              <div class="status-subtitle">Vacuum cleaner commands:</div>
              <div class="flex-horizontal">
                ${supportsStart
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:play"
                          @click="${this.handleStart}"
                          title="Start"
                        ></paper-icon-button>
                      </div>
                      ${supportsPause
                        ? html`
                            <div>
                              <paper-icon-button
                                icon="hass:pause"
                                @click="${this.handlePause}"
                                title="Pause"
                              ></paper-icon-button>
                            </div>
                          `
                        : ""}
                    `
                  : supportsPause
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:play-pause"
                          @click="${this.handlePlayPause}"
                          title="Pause"
                        ></paper-icon-button>
                      </div>
                    `
                  : ""}
                ${supportsStop
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:stop"
                          @click="${this.handleStop}"
                          title="Stop"
                        ></paper-icon-button>
                      </div>
                    `
                  : ""}
                ${supportsCleanSpot
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:broom"
                          @click="${this.handleCleanSpot}"
                          title="Clean spot"
                        ></paper-icon-button>
                      </div>
                    `
                  : ""}
                ${supportsLocate
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:map-marker"
                          @click="${this.handleLocate}"
                          title="Locate"
                        ></paper-icon-button>
                      </div>
                    `
                  : ""}
                ${supportsReturnHome
                  ? html`
                      <div>
                        <paper-icon-button
                          icon="hass:home-map-marker"
                          @click="${this.handleReturnHome}"
                          title="Return home"
                        ></paper-icon-button>
                      </div>
                    `
                  : ""}
              </div>
            </div>
          `
        : ""}
      ${supportsFanSpeed
        ? html`
            <div>
              <div class="flex-horizontal">
                <ha-paper-dropdown-menu
                  label-float=""
                  dynamic-align=""
                  label="Fan speed"
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected="${stateObj.attributes.fan_speed}"
                    @iron-select=${this.handleFanSpeedChanged}
                    attr-for-selected="item-name"
                  >
                    ${stateObj.attributes.fan_speed_list!.map(
                      (mode) => html`
                        <paper-item item-name=${mode}>
                          ${mode}
                        </paper-item>
                      `
                    )}
                  </paper-listbox>
                </ha-paper-dropdown-menu>
                <div
                  style="justify-content: center; align-self: center; padding-top: 1.3em"
                >
                  <span>
                    <iron-icon icon="hass:fan"></iron-icon>
                    ${stateObj.attributes.fan_speed}
                  </span>
                </div>
              </div>
              <p></p>
            </div>
          `
        : ""}

      <ha-attributes
        .stateObj="${this.stateObj}"
        .extraFilters="${filterExtraAtrributes}"
      ></ha-attributes>
    `;
  }

  private handleStop() {
    this.hass.callService("vacuum", "stop", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handlePlayPause() {
    this.hass.callService("vacuum", "start_pause", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handlePause() {
    this.hass.callService("vacuum", "pause", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleStart() {
    this.hass.callService("vacuum", "start", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleLocate() {
    this.hass.callService("vacuum", "locate", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleCleanSpot() {
    this.hass.callService("vacuum", "clean_spot", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleReturnHome() {
    this.hass.callService("vacuum", "return_to_base", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleFanSpeedChanged(ev: CustomEvent) {
    const oldVal = this.stateObj!.attributes.fan_speed;
    const newVal = ev.detail.item.getAttribute("item-name");

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("vacuum", "set_fan_speed", {
      entity_id: this.stateObj!.entity_id,
      fan_speed: newVal,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        @apply --paper-font-body1;
        line-height: 1.5;
      }
      .status-subtitle {
        color: var(--secondary-text-color);
      }
      paper-item {
        cursor: pointer;
      }
      .flex-horizontal {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-vacuum": MoreInfoVacuum;
  }
}
