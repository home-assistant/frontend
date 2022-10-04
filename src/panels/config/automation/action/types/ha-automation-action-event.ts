import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-service-picker";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../../components/ha-yaml-editor";
import type { EventAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";

@customElement("ha-automation-action-event")
export class HaEventAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public action!: EventAction;

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

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
      <ha-textfield
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.event"
        )}
        .value=${event}
        .disabled=${this.disabled}
        @change=${this._eventChanged}
      ></ha-textfield>
      <ha-yaml-editor
        .hass=${this.hass}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.event_data"
        )}
        .name=${"event_data"}
        .readOnly=${this.disabled}
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

  private _eventChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.action, event: (ev.target as any).value },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-textfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-event": HaEventAction;
  }
}
