import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { consume } from "@lit/context";
import type { Schema } from "js-yaml";
import { DEFAULT_SCHEMA } from "js-yaml";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-yaml-editor";
import "../../../../../components/user/ha-users-picker";
import type { EventTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import type { TriggerElement } from "../ha-automation-trigger-row";
import { handleChangeEvent } from "../ha-automation-trigger-row";
import { yamlSchemaContext } from "../../../../../data/blueprint";

@customElement("ha-automation-trigger-event")
export class HaEventTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: EventTrigger;

  @property({ type: Boolean }) public disabled = false;

  @consume({ context: yamlSchemaContext })
  private _yamlSchema?: Schema;

  public static get defaultConfig(): EventTrigger {
    return { trigger: "event", event_type: "" };
  }

  protected render() {
    const { event_type, event_data, context } = this.trigger;
    return html`
      <ha-textfield
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_type"
        )}
        name="event_type"
        .value=${event_type}
        .disabled=${this.disabled}
        @change=${this._valueChanged}
      ></ha-textfield>
      <ha-yaml-editor
        .hass=${this.hass}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_data"
        )}
        .name=${"event_data"}
        .readOnly=${this.disabled}
        .defaultValue=${event_data}
        .yamlSchema=${this._yamlSchema ?? DEFAULT_SCHEMA}
        @value-changed=${this._dataChanged}
      ></ha-yaml-editor>
      <br />
      ${this.hass.localize(
        "ui.panel.config.automation.editor.triggers.type.event.context_users"
      )}
      <ha-users-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .value=${this._wrapUsersInArray(context?.user_id)}
        @value-changed=${this._usersChanged}
      ></ha-users-picker>
    `;
  }

  private _wrapUsersInArray(user_id: string | string[] | undefined): string[] {
    if (!user_id) {
      return [];
    }
    if (typeof user_id === "string") {
      return [user_id];
    }
    return user_id;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    handleChangeEvent(this, ev);
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    handleChangeEvent(this, ev);
  }

  private _usersChanged(ev) {
    ev.stopPropagation();
    const value = { ...this.trigger };
    if (!ev.detail.value.length && value.context) {
      delete value.context.user_id;
    } else {
      if (!value.context) {
        value.context = {};
      }
      value.context.user_id = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  static styles = css`
    ha-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-event": HaEventTrigger;
  }
}
