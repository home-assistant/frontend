import { CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { Action, IfAction } from "../../../../../data/script";
import { HaDeviceCondition } from "../../condition/types/ha-automation-condition-device";
import { HaDeviceAction } from "./ha-automation-action-device_id";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { Condition } from "../../../../lovelace/common/validate-condition";
import "../ha-automation-action";
import "../../../../../components/ha-textfield";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-if")
export class HaIfAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: IfAction;

  public static get defaultConfig() {
    return {
      if: [{ ...HaDeviceCondition.defaultConfig, condition: "device" }],
      then: [HaDeviceAction.defaultConfig],
    };
  }

  protected render() {
    const action = this.action;

    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.if"
        )}*:
      </h3>
      <ha-automation-condition
        .conditions=${action.if}
        .hass=${this.hass}
        @value-changed=${this._ifChanged}
      ></ha-automation-condition>

      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.then"
        )}*:
      </h3>
      <ha-automation-action
        .actions=${action.then}
        @value-changed=${this._thenChanged}
        .hass=${this.hass}
      ></ha-automation-action>

      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.else"
        )}:
      </h3>
      <ha-automation-action
        .actions=${action.else || []}
        @value-changed=${this._elseChanged}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
  }

  private _ifChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        if: value,
      },
    });
  }

  private _thenChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        then: value,
      },
    });
  }

  private _elseChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];

    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        else: value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-if": HaIfAction;
  }
}
