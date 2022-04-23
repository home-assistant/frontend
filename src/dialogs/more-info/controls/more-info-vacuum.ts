import "@material/mwc-list/mwc-list-item";
import {
  mdiFan,
  mdiHomeMapMarker,
  mdiMapMarker,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiTargetVariant,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import { UNAVAILABLE } from "../../../data/entity";
import {
  VacuumEntity,
  VACUUM_SUPPORT_BATTERY,
  VACUUM_SUPPORT_CLEAN_SPOT,
  VACUUM_SUPPORT_FAN_SPEED,
  VACUUM_SUPPORT_LOCATE,
  VACUUM_SUPPORT_PAUSE,
  VACUUM_SUPPORT_RETURN_HOME,
  VACUUM_SUPPORT_START,
  VACUUM_SUPPORT_STATUS,
  VACUUM_SUPPORT_STOP,
} from "../../../data/vacuum";
import { HomeAssistant } from "../../../types";

interface VacuumCommand {
  translationKey: string;
  icon: string;
  serviceName: string;
  isVisible: (stateObj: VacuumEntity) => boolean;
}

const VACUUM_COMMANDS: VacuumCommand[] = [
  {
    translationKey: "start",
    icon: mdiPlay,
    serviceName: "start",
    isVisible: (stateObj) => supportsFeature(stateObj, VACUUM_SUPPORT_START),
  },
  {
    translationKey: "pause",
    icon: mdiPause,
    serviceName: "pause",
    isVisible: (stateObj) =>
      // We need also to check if Start is supported because if not we show play-pause
      supportsFeature(stateObj, VACUUM_SUPPORT_START) &&
      supportsFeature(stateObj, VACUUM_SUPPORT_PAUSE),
  },
  {
    translationKey: "start_pause",
    icon: mdiPlayPause,
    serviceName: "start_pause",
    isVisible: (stateObj) =>
      // If start is supported, we don't show this button
      !supportsFeature(stateObj, VACUUM_SUPPORT_START) &&
      supportsFeature(stateObj, VACUUM_SUPPORT_PAUSE),
  },
  {
    translationKey: "stop",
    icon: mdiStop,
    serviceName: "stop",
    isVisible: (stateObj) => supportsFeature(stateObj, VACUUM_SUPPORT_STOP),
  },
  {
    translationKey: "clean_spot",
    icon: mdiTargetVariant,
    serviceName: "clean_spot",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VACUUM_SUPPORT_CLEAN_SPOT),
  },
  {
    translationKey: "locate",
    icon: mdiMapMarker,
    serviceName: "locate",
    isVisible: (stateObj) => supportsFeature(stateObj, VACUUM_SUPPORT_LOCATE),
  },
  {
    translationKey: "return_home",
    icon: mdiHomeMapMarker,
    serviceName: "return_to_base",
    isVisible: (stateObj) =>
      supportsFeature(stateObj, VACUUM_SUPPORT_RETURN_HOME),
  },
];

@customElement("more-info-vacuum")
class MoreInfoVacuum extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: VacuumEntity;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;

    const filterExtraAttributes =
      "fan_speed,fan_speed_list,status,battery_level,battery_icon";

    return html`
      ${stateObj.state !== UNAVAILABLE
        ? html` <div class="flex-horizontal">
            ${supportsFeature(stateObj, VACUUM_SUPPORT_STATUS)
              ? html`
                  <div>
                    <span class="status-subtitle"
                      >${this.hass!.localize(
                        "ui.dialogs.more_info_control.vacuum.status"
                      )}:
                    </span>
                    <span>
                      <strong>
                        ${stateObj.attributes.status ||
                        this.hass.localize(
                          `component.vacuum.state._.${stateObj.state}`
                        ) ||
                        stateObj.state}
                      </strong>
                    </span>
                  </div>
                `
              : ""}
            ${supportsFeature(stateObj, VACUUM_SUPPORT_BATTERY) &&
            stateObj.attributes.battery_level
              ? html`
                  <div>
                    <span>
                      ${stateObj.attributes.battery_level} %
                      <ha-icon
                        .icon=${stateObj.attributes.battery_icon}
                      ></ha-icon>
                    </span>
                  </div>
                `
              : ""}
          </div>`
        : ""}
      ${VACUUM_COMMANDS.some((item) => item.isVisible(stateObj))
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
                  item.isVisible(stateObj)
                ).map(
                  (item) => html`
                    <div>
                      <ha-icon-button
                        .path=${item.icon}
                        .entry=${item}
                        @click=${this.callService}
                        .label=${this.hass!.localize(
                          `ui.dialogs.more_info_control.vacuum.${item.translationKey}`
                        )}
                        .disabled=${stateObj.state === UNAVAILABLE}
                      ></ha-icon-button>
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
                <ha-select
                  .label=${this.hass!.localize(
                    "ui.dialogs.more_info_control.vacuum.fan_speed"
                  )}
                  .disabled=${stateObj.state === UNAVAILABLE}
                  .value=${stateObj.attributes.fan_speed}
                  @selected=${this.handleFanSpeedChanged}
                  fixedMenuPosition
                  naturalMenuWidth
                  @closed=${stopPropagation}
                >
                  ${stateObj.attributes.fan_speed_list!.map(
                    (mode) => html`
                      <mwc-list-item .value=${mode}>${mode}</mwc-list-item>
                    `
                  )}
                </ha-select>
                <div
                  style="justify-content: center; align-self: center; padding-top: 1.3em"
                >
                  <span>
                    <ha-svg-icon .path=${mdiFan}></ha-svg-icon>
                    ${stateObj.attributes.fan_speed}
                  </span>
                </div>
              </div>
              <p></p>
            </div>
          `
        : ""}

      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        .extraFilters=${filterExtraAttributes}
      ></ha-attributes>
    `;
  }

  private callService(ev: CustomEvent) {
    const entry = (ev.target! as any).entry as VacuumCommand;
    this.hass.callService("vacuum", entry.serviceName, {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private handleFanSpeedChanged(ev) {
    const oldVal = this.stateObj!.attributes.fan_speed;
    const newVal = ev.target.value;

    if (!newVal || oldVal === newVal) {
      return;
    }

    this.hass.callService("vacuum", "set_fan_speed", {
      entity_id: this.stateObj!.entity_id,
      fan_speed: newVal,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        line-height: 1.5;
      }
      .status-subtitle {
        color: var(--secondary-text-color);
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
