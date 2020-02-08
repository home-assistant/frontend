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

import { supportsFeature } from "../../../common/entity/supports-feature";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-attributes";
import {
  VACUUM_SUPPORT_BATTERY,
  VACUUM_SUPPORT_CLEAN_SPOT,
  VACUUM_SUPPORT_FAN_SPEED,
  VACUUM_SUPPORT_LOCATE,
  VACUUM_SUPPORT_PAUSE,
  VACUUM_SUPPORT_RETURN_HOME,
  VACUUM_SUPPORT_START,
  VACUUM_SUPPORT_STATUS,
  VACUUM_SUPPORT_STOP,
  VacuumEntity,
} from "../../../data/vacuum";

class VacuumCommand {
  public translationKey: string;
  public icon: string;
  public serviceName: string;
  private funcIsVisible: (stateObj: VacuumEntity) => boolean;

  constructor(
    translationKey: string,
    icon: string,
    serviceName: string,
    funcIsVisible: (stateObj: VacuumEntity) => boolean
  ) {
    this.translationKey = translationKey;
    this.icon = icon;
    this.serviceName = serviceName;
    this.funcIsVisible = funcIsVisible;
  }

  public shouldVisible(stateObj: VacuumEntity): boolean {
    return this.funcIsVisible(stateObj);
  }
}

const VACUUM_COMMANDS: VacuumCommand[] = [
  new VacuumCommand("start", "hass:play", "start", (stateObj) =>
    supportsFeature(stateObj, VACUUM_SUPPORT_START)
  ),
  new VacuumCommand(
    "pause",
    "hass:pause",
    "pause",
    (stateObj) =>
      // We need also to check if Start is supported because if not we show play-pause
      supportsFeature(stateObj, VACUUM_SUPPORT_START) &&
      supportsFeature(stateObj, VACUUM_SUPPORT_PAUSE)
  ),
  new VacuumCommand(
    "pause",
    "hass:play-pause",
    "start_pause",
    (stateObj) =>
      // If start is supoorted, we don't show this button
      !supportsFeature(stateObj, VACUUM_SUPPORT_START) &&
      supportsFeature(stateObj, VACUUM_SUPPORT_PAUSE)
  ),
  new VacuumCommand("stop", "hass:stop", "stop", (stateObj) =>
    supportsFeature(stateObj, VACUUM_SUPPORT_STOP)
  ),
  new VacuumCommand("clean_spot", "hass:broom", "clean_spot", (stateObj) =>
    supportsFeature(stateObj, VACUUM_SUPPORT_CLEAN_SPOT)
  ),
  new VacuumCommand("locate", "hass:map-marker", "locate", (stateObj) =>
    supportsFeature(stateObj, VACUUM_SUPPORT_LOCATE)
  ),
  new VacuumCommand(
    "return_home",
    "hass:home-map-marker",
    "return_to_base",
    (stateObj) => supportsFeature(stateObj, VACUUM_SUPPORT_RETURN_HOME)
  ),
];

// tslint:disable-next-line:max-classes-per-file
@customElement("more-info-vacuum")
class MoreInfoVacuum extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public stateObj?: VacuumEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    const filterExtraAtrributes =
      "fan_speed,fan_speed_list,status,battery_level,battery_icon";

    const supportsCommandBar =
      supportsFeature(stateObj, VACUUM_SUPPORT_PAUSE) ||
      supportsFeature(stateObj, VACUUM_SUPPORT_STOP) ||
      supportsFeature(stateObj, VACUUM_SUPPORT_RETURN_HOME) ||
      supportsFeature(stateObj, VACUUM_SUPPORT_LOCATE) ||
      supportsFeature(stateObj, VACUUM_SUPPORT_CLEAN_SPOT) ||
      supportsFeature(stateObj, VACUUM_SUPPORT_START);

    return html`
      <div class="flex-horizontal">
        ${supportsFeature(stateObj, VACUUM_SUPPORT_STATUS)
          ? html`
              <div>
                <span class="status-subtitle"
                  >${this.hass!.localize(
                    "ui.dialogs.more_info_control.vacuum.status"
                  )}:
                </span>
                <span><strong>${stateObj.attributes.status}</strong></span>
              </div>
            `
          : ""}
        ${supportsFeature(stateObj, VACUUM_SUPPORT_BATTERY)
          ? html`
              <div">
                <span>
                  <iron-icon icon=${stateObj.attributes.battery_icon}></iron-icon>
                  ${stateObj.attributes.battery_level} %
                  </span>
              </div>`
          : ""}
      </div>

      ${supportsCommandBar
        ? html`
            <div>
              <p></p>
              <div class="status-subtitle">
                ${this.hass!.localize(
                  "ui.dialogs.more_info_control.vacuum.commands"
                )}
              </div>
              <div class="flex-horizontal">
                ${VACUUM_COMMANDS.filter((item) =>
                  item.shouldVisible(stateObj)
                ).map(
                  (item) => html`
                    <div>
                      <paper-icon-button
                        icon=${item.icon}
                        .entry=${item}"
                        @click=${this.callService}
                        title=${this.hass!.localize(
                          `ui.dialogs.more_info_control.vacuum.${item.translationKey}`
                        )}
                      ></paper-icon-button>
                    </div>
                  `
                )}
              </div>
            </div>
          `
        : ""}
      ${supportsFeature(stateObj, VACUUM_SUPPORT_FAN_SPEED)
        ? html`
            <div>
              <div class="flex-horizontal">
                <ha-paper-dropdown-menu
                  label=${this.hass!.localize(
                    "ui.dialogs.more_info_control.vacuum.fan_speed"
                  )}
                >
                  <paper-listbox
                    slot="dropdown-content"
                    .selected=${stateObj.attributes.fan_speed}
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
        .stateObj=${this.stateObj}
        .extraFilters=${filterExtraAtrributes}
      ></ha-attributes>
    `;
  }

  private callService(ev: CustomEvent) {
    const entry = (ev.target! as any).entry as VacuumCommand;
    this.hass.callService("vacuum", entry.serviceName, {
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
