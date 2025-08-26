import { type CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import type { Action, ChooseAction, Option } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../../option/ha-automation-option";
import type HaAutomationOption from "../../option/ha-automation-option";
import "../ha-automation-action";
import type HaAutomationAction from "../ha-automation-action";
import type { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: ChooseAction;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public indent = false;

  @state() private _showDefault = false;

  @query("ha-automation-option") private _optionElement?: HaAutomationOption;

  @query("ha-automation-action") private _actionElement?: HaAutomationAction;

  public static get defaultConfig(): ChooseAction {
    return { choose: [{ conditions: [], sequence: [] }] };
  }

  protected render() {
    const action = this.action;

    const options = action.choose ? ensureArray(action.choose) : [];

    return html`
      <ha-automation-option
        .options=${options}
        .disabled=${this.disabled}
        @value-changed=${this._optionsChanged}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .optionsInSidebar=${this.indent}
        .showDefaultActions=${this._showDefault || !!action.default}
        @show-default-actions=${this._addDefault}
      ></ha-automation-option>

      ${this._showDefault || action.default
        ? html`
            <h4 class="default-actions">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.default"
              )}:
            </h4>
            <ha-automation-action
              .actions=${ensureArray(action.default) || []}
              .disabled=${this.disabled}
              @value-changed=${this._defaultChanged}
              .hass=${this.hass}
              .narrow=${this.narrow}
              .optionsInSidebar=${this.indent}
            ></ha-automation-action>
          `
        : nothing}
    `;
  }

  private _addDefault() {
    this._showDefault = true;
  }

  private _optionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Option[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        choose: value,
      },
    });
  }

  private _defaultChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._showDefault = true;
    const defaultAction = ev.detail.value as Action[];
    const newValue: ChooseAction = {
      ...this.action,
      default: defaultAction,
    };
    if (defaultAction.length === 0) {
      delete newValue.default;
    }
    fireEvent(this, "value-changed", { value: newValue });
  }

  public expandAll() {
    this._optionElement?.expandAll();
    this._actionElement?.expandAll();
  }

  public collapseAll() {
    this._optionElement?.collapseAll();
    this._actionElement?.collapseAll();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .link-button-row {
          padding: 14px 14px 0 14px;
        }
        h4.default-actions {
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-choose": HaChooseAction;
  }
}
