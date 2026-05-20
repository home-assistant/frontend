import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import { hasLocation } from "../../../../../common/entity/has_location";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../../../../components/radio/ha-radio-group";
import "../../../../../components/radio/ha-radio-option";
import type { ZoneTrigger } from "../../../../../data/automation";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

const includeDomains = ["zone"];

@customElement("ha-automation-trigger-zone")
export class HaZoneTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: ZoneTrigger;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): ZoneTrigger {
    return {
      trigger: "zone",
      entity_id: "",
      zone: "",
      event: "enter" as ZoneTrigger["event"],
    };
  }

  protected render() {
    const { entity_id, zone, event } = this.trigger;
    return html`
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.entity"
        )}
        .value=${entity_id}
        .disabled=${this.disabled}
        @value-changed=${this._entityPicked}
        .hass=${this.hass}
        .entityFilter=${zoneAndLocationFilter}
      ></ha-entity-picker>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.zone"
        )}
        .value=${zone}
        .disabled=${this.disabled}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        .includeDomains=${includeDomains}
      ></ha-entity-picker>

      <ha-radio-group
        orientation="horizontal"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.event"
        )}
        .value=${event}
        .disabled=${this.disabled}
        @change=${this._radioGroupPicked}
        name="event"
      >
        <ha-radio-option value="enter">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.enter"
          )}
        </ha-radio-option>
        <ha-radio-option value="leave">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.leave"
          )}
        </ha-radio-option>
      </ha-radio-group>
    `;
  }

  private _entityPicked(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, entity_id: ev.detail.value },
    });
  }

  private _zonePicked(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, zone: ev.detail.value },
    });
  }

  private _radioGroupPicked(ev: Event) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        event: (ev.currentTarget as HaRadioGroup).value,
      },
    });
  }

  static styles = css`
    ha-entity-picker {
      display: block;
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-zone": HaZoneTrigger;
  }
}
