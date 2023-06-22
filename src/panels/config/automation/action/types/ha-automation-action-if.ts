import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-textfield";
import { Action, IfAction } from "../../../../../data/script";
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

  @property({ type: Boolean }) public reOrderMode = false;

  @state() private _showElse = false;

  public static get defaultConfig() {
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
        nested
        .conditions=${action.if}
        .reOrderMode=${this.reOrderMode}
        .disabled=${this.disabled}
        @value-changed=${this._ifChanged}
        .hass=${this.hass}
      ></ha-automation-condition>

      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.if.then"
        )}*:
      </h3>
      <ha-automation-action
        nested
        .actions=${action.then}
        .reOrderMode=${this.reOrderMode}
        .disabled=${this.disabled}
        @value-changed=${this._thenChanged}
        .hass=${this.hass}
      ></ha-automation-action>
      ${this._showElse || action.else
        ? html`
            <h3>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.if.else"
              )}:
            </h3>
            <ha-automation-action
              nested
              .actions=${action.else || []}
              .reOrderMode=${this.reOrderMode}
              .disabled=${this.disabled}
              @value-changed=${this._elseChanged}
              .hass=${this.hass}
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
    const value = ev.detail.value as Action[];

    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        else: value,
      },
    });
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
