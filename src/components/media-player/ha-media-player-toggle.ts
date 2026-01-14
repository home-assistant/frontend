import { type CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiSpeaker, mdiSpeakerPause, mdiSpeakerPlay } from "@mdi/js";
import memoizeOne from "memoize-one";

import type { HomeAssistant } from "../../types";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { computeRTL } from "../../common/util/compute_rtl";
import { fireEvent } from "../../common/dom/fire_event";

import "../ha-switch";
import "../ha-svg-icon";

@customElement("ha-media-player-toggle")
class HaMediaPlayerToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean }) public checked = false;

  @property({ type: Boolean }) public disabled = false;

  private _computeDisplayData = memoizeOne(
    (
      entityId: string,
      entities: HomeAssistant["entities"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      floors: HomeAssistant["floors"],
      isRTL: boolean,
      stateObj: HomeAssistant["states"][string]
    ) => {
      const [entityName, deviceName, areaName] = computeEntityNameList(
        stateObj,
        [{ type: "entity" }, { type: "device" }, { type: "area" }],
        entities,
        devices,
        areas,
        floors
      );

      const primary = entityName || deviceName || entityId;
      const secondary = [areaName, entityName ? deviceName : undefined]
        .filter(Boolean)
        .join(isRTL ? " ◂ " : " ▸ ");

      return { primary, secondary };
    }
  );

  protected render() {
    const stateObj = this.hass.states[this.entityId];

    let icon = mdiSpeaker;
    if (stateObj.state === "playing") {
      icon = mdiSpeakerPlay;
    } else if (stateObj.state === "paused") {
      icon = mdiSpeakerPause;
    }

    const isRTL = computeRTL(this.hass);

    const { primary, secondary } = this._computeDisplayData(
      this.entityId,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors,
      isRTL,
      stateObj
    );

    return html`<div class="list-item">
      <ha-svg-icon .path=${icon}></ha-svg-icon>
      <div class="info">
        <div class="main-text">${primary}</div>
        <div class="secondary-text">${secondary}</div>
      </div>
      <ha-switch
        .disabled=${this.disabled}
        .checked=${this.checked}
        @change=${this._handleChange}
      ></ha-switch>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .list-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          column-gap: var(--ha-space-4);
          align-items: center;
          width: 100%;
        }

        .info {
          min-width: 0;
        }

        .main-text {
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
    ];
  }

  private _handleChange(ev) {
    ev.stopPropagation();

    this.checked = ev.target.checked;
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-toggle": HaMediaPlayerToggle;
  }
}
