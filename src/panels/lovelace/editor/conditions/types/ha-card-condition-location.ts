import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { array, assert, literal, object, string } from "superstruct";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-check-list-item";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-list";
import type { HomeAssistant } from "../../../../../types";
import type { LocationCondition } from "../../../common/validate-condition";
import "../../../../../components/ha-form/ha-form";

const locationConditionStruct = object({
  condition: literal("location"),
  locations: array(string()),
});

const SCHEMA = [
  {
    name: "locations",
    selector: {
      state: {
        entity_id: "person.whomever",
        hide_states: ["unavailable", "unknown"],
        multiple: true,
      },
    },
  },
];

@customElement("ha-card-condition-location")
export class HaCardConditionLocation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: LocationCondition;

  @property({ type: Boolean }) public disabled = false;

  public static get defaultConfig(): LocationCondition {
    return { condition: "location", locations: [] };
  }

  protected static validateUIConfig(condition: LocationCondition) {
    return assert(condition, locationConditionStruct);
  }

  protected render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.condition}
        .schema=${SCHEMA}
        .disabled=${this.disabled}
        @value-changed=${this._valueChanged}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
      ></ha-form>
    `;
  }

  private _valueChanged(ev) {
    ev.stopPropagation();

    const locations = ev.detail.value.locations;
    const condition: LocationCondition = {
      ...this.condition,
      locations,
    };

    fireEvent(this, "value-changed", { value: condition });
  }

  private _computeLabelCallback = (schema): string => {
    switch (schema.name) {
      case "locations":
        return this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.location.locations"
        );
      default:
        return "";
    }
  };

  private _computeHelperCallback = (schema): string => {
    switch (schema.name) {
      case "locations":
        return this.hass.localize(
          "ui.panel.lovelace.editor.condition-editor.condition.location.locations_helper"
        );
      default:
        return "";
    }
  };

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-card-condition-location": HaCardConditionLocation;
  }
}
