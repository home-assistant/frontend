import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-service-picker";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-yaml-editor";

import {
  LitElement,
  property,
  customElement,
  PropertyValues,
  query,
} from "lit-element";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { html } from "lit-html";
import { EventAction } from "../../../../../data/script";
// tslint:disable-next-line
import { HaYamlEditor } from "../../../../../components/ha-yaml-editor";

@customElement("ha-automation-action-event")
export class HaEventAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: EventAction;
  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;
  private _actionData?: EventAction["event_data"];

  public static get defaultConfig(): EventAction {
    return { event: "", event_data: {} };
  }

  protected updated(changedProperties: PropertyValues) {
    if (!changedProperties.has("action")) {
      return;
    }
    if (this._actionData && this._actionData !== this.action.event_data) {
      if (this._yamlEditor) {
        this._yamlEditor.setValue(this.action.event_data);
      }
    }
    this._actionData = this.action.event_data;
  }

  protected render() {
    const { event, event_data } = this.action;

    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.event"
        )}
        name="event"
        .value=${event}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.service_data"
        )}
        .name=${"event_data"}
        .defaultValue=${event_data}
        @value-changed=${this._dataChanged}
      ></ha-yaml-editor>
    `;
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._actionData = ev.detail.value;
    handleChangeEvent(this, ev);
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-event": HaEventAction;
  }
}
