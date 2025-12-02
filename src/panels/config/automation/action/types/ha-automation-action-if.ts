import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, queryAll } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import type { Action, IfAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { Condition } from "../../../../lovelace/common/validate-condition";
import type HaAutomationCondition from "../../condition/ha-automation-condition";
import "../ha-automation-action";
import type HaAutomationAction from "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-if")
export class HaIfAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: IfAction;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public indent = false;

  @query("ha-automation-condition")
  private _conditionElement?: HaAutomationCondition;

  @queryAll("ha-automation-action")
  private _actionElements?: HaAutomationAction[];

  public static get defaultConfig(): IfAction {
    return {
      if: [],
      then: [],
    };
  }

  protected render() {
    const action = this.action;

    return html`
      <h4>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.if"
        )}:
      </h4>
      <ha-automation-condition
        .conditions=${action.if ?? []}
        .disabled=${this.disabled}
        @value-changed=${this._ifChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${this.indent}
      ></ha-automation-condition>

      <h4>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.then"
        )}:
      </h4>
      <ha-automation-action
        .actions=${action.then ?? []}
        .disabled=${this.disabled}
        @value-changed=${this._thenChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${this.indent}
      ></ha-automation-action>
      <h4>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.else"
        )}:
      </h4>
      <ha-automation-action
        .actions=${action.else || []}
        .disabled=${this.disabled}
        @value-changed=${this._elseChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${this.indent}
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
    const elseAction = ev.detail.value as Action[];
    const newValue: IfAction = {
      ...this.action,
      else: elseAction,
    };
    if (elseAction.length === 0) {
      delete newValue.else;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }

  public expandAll() {
    this._conditionElement?.expandAll();
    this._actionElements?.forEach((element) => element.expandAll?.());
  }

  public collapseAll() {
    this._conditionElement?.collapseAll();
    this._actionElements?.forEach((element) => element.collapseAll?.());
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h4 {
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
        h4:first-child {
          margin-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-if": HaIfAction;
  }
}
