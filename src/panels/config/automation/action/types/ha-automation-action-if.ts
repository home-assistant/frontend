import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import type { Action, IfAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { Condition } from "../../../../lovelace/common/validate-condition";
import "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-if")
export class HaIfAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: IfAction;

  @property({ type: Boolean }) public narrow = false;

  @state() private _showElse = false;

  public static get defaultConfig(): IfAction {
    return {
      if: [],
      then: [],
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
        .disabled=${this.disabled}
        @value-changed=${this._ifChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-automation-condition>

      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.then"
        )}*:
      </h3>
      <ha-automation-action
        .actions=${action.then}
        .disabled=${this.disabled}
        @value-changed=${this._thenChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-automation-action>
      ${this._showElse || action.else
        ? html`
            <h3>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.if.else"
              )}:
            </h3>
            <ha-automation-action
              .actions=${action.else || []}
              .disabled=${this.disabled}
              @value-changed=${this._elseChanged}
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-automation-action>
          `
        : html` <div class="link-button-row">
            <button
              class="link"
              @click=${this._addElse}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.if.add_else"
              )}
            </button>
          </div>`}
    `;
  }

  private _addElse() {
    this._showElse = true;
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
    this._showElse = true;
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .link-button-row {
          padding: 14px;
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
