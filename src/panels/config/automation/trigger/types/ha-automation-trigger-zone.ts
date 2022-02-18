import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-formfield";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import { hasLocation } from "../../../../../common/entity/has_location";
import type { ZoneTrigger } from "../../../../../data/automation";
import type { PolymerChangedEvent } from "../../../../../polymer-types";
import type { HomeAssistant } from "../../../../../types";
import type { HaRadio } from "../../../../../components/ha-radio";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

const includeDomains = ["zone"];

@customElement("ha-automation-trigger-zone")
export class HaZoneTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: ZoneTrigger;

  public static get defaultConfig() {
    return {
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
        @value-changed=${this._entityPicked}
        .hass=${this.hass}
        allow-custom-entity
        .entityFilter=${zoneAndLocationFilter}
      ></ha-entity-picker>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.zone"
        )}
        .value=${zone}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        allow-custom-entity
        .includeDomains=${includeDomains}
      ></ha-entity-picker>

      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.event"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.enter"
          )}
        >
          <ha-radio
            name="event"
            value="enter"
            .checked=${event === "enter"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.leave"
          )}
        >
          <ha-radio
            name="event"
            value="leave"
            .checked=${event === "leave"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>
    `;
  }

  private _entityPicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, entity_id: ev.detail.value },
    });
  }

  private _zonePicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, zone: ev.detail.value },
    });
  }

  private _radioGroupPicked(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        event: (ev.target as HaRadio).value,
      },
    });
  }

  static styles = css`
    label {
      display: flex;
      align-items: center;
    }
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
