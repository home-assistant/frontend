import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import { TagTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-tag")
export class HaTagTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TagTrigger;

  public static get defaultConfig() {
    return { tag_id: "" };
  }

  protected render() {
    const { tag_id } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.tag.tag_id"
        )}
        name="tag_id"
        .value=${tag_id}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}
