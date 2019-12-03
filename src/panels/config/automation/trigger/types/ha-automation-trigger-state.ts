import "@polymer/paper-input/paper-input";
import "../../../../../components/entity/ha-entity-picker";
import { LitElement, property, html, customElement } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger;

  public static get defaultConfig() {
    return { entity_id: "" };
  }

  protected render() {
    const { entity_id, to, from } = this.trigger;
    let trgFor = this.trigger.for;

    if (trgFor && (trgFor.hours || trgFor.minutes || trgFor.seconds)) {
      // If the trigger was defined using the yaml dict syntax, convert it to
      // the equivalent string format
      let { hours = 0, minutes = 0, seconds = 0 } = trgFor;
      hours = hours.toString();
      minutes = minutes.toString().padStart(2, "0");
      seconds = seconds.toString().padStart(2, "0");

      trgFor = `${hours}:${minutes}:${seconds}`;
    }

    return html`
      <ha-entity-picker
        .value=${entity_id}
        @value-changed=${this._entityPicked}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.from"
        )}
        .name=${"from"}
        .value=${from}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.to"
        )}
        .name=${"to"}
        .value=${to}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        .name=${"for"}
        .value=${trgFor}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev): void {
    ev.stopPropagation();
    const name = ev.target.name;
    const newVal = ev.detail.value;

    if (this.trigger[name] === newVal) {
      return;
    }
    let trigger;
    if (!newVal) {
      trigger = { ...this.trigger };
      delete trigger[name];
    } else {
      trigger = { ...this.trigger, [name]: newVal };
    }
    fireEvent(this, "value-changed", { value: trigger });
  }

  private _entityPicked(ev: CustomEvent) {
    ev.stopPropagation();

    fireEvent(this, "value-changed", {
      value: { ...this.trigger, entity_id: ev.target.value },
    });
  }
}
