import "../../condition/ha-automation-condition-editor";

import { LitElement, property, customElement, html } from "lit-element";
import { ActionElement } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { Condition } from "../../../../../data/automation";

@customElement("ha-automation-action-condition")
export class HaConditionAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: Condition;

  public static get defaultConfig() {
    return { condition: "state" };
  }

  public render() {
    return html`
      <ha-automation-condition-editor
        .condition=${this.action}
        .hass=${this.hass}
        @value-changed=${this._conditionChanged}
      ></ha-automation-condition-editor>
    `;
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();

    fireEvent(this, "value-changed", {
      value: ev.detail.value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-condition": HaConditionAction;
  }
}
