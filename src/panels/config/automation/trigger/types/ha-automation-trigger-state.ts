import "@polymer/paper-input/paper-input";
import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { hasTemplate } from "../../../../../common/string/has-template";
import "../../../../../components/entity/ha-entity-attribute-picker";
import "../../../../../components/entity/ha-entity-picker";
import { StateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-duration-input";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: StateTrigger;

  public static get defaultConfig() {
    return { entity_id: "" };
  }

  public willUpdate(changedProperties: PropertyValues) {
    if (!changedProperties.has("trigger")) {
      return;
    }
    // Check for templates in trigger. If found, revert to YAML mode.
    if (this.trigger && hasTemplate(this.trigger)) {
      fireEvent(
        this,
        "ui-mode-not-available",
        Error(this.hass.localize("ui.errors.config.no_template_editor_support"))
      );
    }
  }

  protected render() {
    const { entity_id, attribute, to, from } = this.trigger;
    const trgFor = createDurationData(this.trigger.for);

    return html`
      <ha-entity-picker
        .value=${entity_id}
        @value-changed=${this._valueChanged}
        .name=${"entity_id"}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${entity_id}
        .value=${attribute}
        .name=${"attribute"}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.attribute"
        )}
        @value-changed=${this._valueChanged}
        allow-custom-value
      ></ha-entity-attribute-picker>
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
      <ha-duration-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        .name=${"for"}
        .data=${trgFor}
        @value-changed=${this._valueChanged}
      ></ha-duration-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
