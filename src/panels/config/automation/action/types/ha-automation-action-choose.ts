import { mdiDelete, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ensureArray } from "../../../../../common/ensure-array";
import "../../../../../components/ha-icon-button";
import { Condition } from "../../../../../data/automation";
import { Action, ChooseAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public action!: ChooseAction;

  @property({ type: Boolean }) public reOrderMode = false;

  @state() private _showDefault = false;

  public static get defaultConfig() {
    return { choose: [{ conditions: [], sequence: [] }] };
  }

  protected render() {
    const action = this.action;

    return html`
      ${(action.choose ? ensureArray(action.choose) : []).map(
        (option, idx) => html`<ha-card outlined>
          <ha-expansion-panel leftChevron>
            <h3 slot="header">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.option",
                "number",
                idx + 1
              )}
            </h3>
            <slot name="icons" slot="icons"></slot>

            <ha-icon-button
              .idx=${idx}
              slot="icons"
              .disabled=${this.disabled}
              @click=${this._removeOption}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.remove_option"
              )}
              .path=${mdiDelete}
            ></ha-icon-button>
            <div class="card-content">
              <h3>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.choose.conditions"
                )}:
              </h3>
              <ha-automation-condition
                .conditions=${ensureArray<string | Condition>(
                  option.conditions
                )}
                .reOrderMode=${this.reOrderMode}
                .disabled=${this.disabled}
                .hass=${this.hass}
                .idx=${idx}
                @value-changed=${this._conditionChanged}
              ></ha-automation-condition>
              <h3>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.choose.sequence"
                )}:
              </h3>
              <ha-automation-action
                .actions=${ensureArray(option.sequence) || []}
                .reOrderMode=${this.reOrderMode}
                .disabled=${this.disabled}
                .hass=${this.hass}
                .idx=${idx}
                @value-changed=${this._actionChanged}
              ></ha-automation-action>
            </div>
          </ha-expansion-panel>
        </ha-card>`
      )}
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.add_option"
        )}
        .disabled=${this.disabled}
        @click=${this._addOption}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
      ${this._showDefault || action.default
        ? html`
            <h2>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.default"
              )}:
            </h2>
            <ha-automation-action
              .actions=${ensureArray(action.default) || []}
              .reOrderMode=${this.reOrderMode}
              .disabled=${this.disabled}
              @value-changed=${this._defaultChanged}
              .hass=${this.hass}
            ></ha-automation-action>
          `
        : html`<div class="link-button-row">
            <button
              class="link"
              @click=${this._addDefault}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.add_default"
              )}
            </button>
          </div>`}
    `;
  }

  private _addDefault() {
    this._showDefault = true;
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].conditions = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    const index = (ev.target as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose[index].sequence = value;
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _addOption() {
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.push({ conditions: [], sequence: [] });
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _removeOption(ev: CustomEvent) {
    const index = (ev.currentTarget as any).idx;
    const choose = this.action.choose
      ? [...ensureArray(this.action.choose)]
      : [];
    choose.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this.action, choose },
    });
  }

  private _defaultChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        default: value,
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin: 16px 0;
        }
        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 0 0 8px;
          --expansion-panel-content-padding: 0;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        .card-content {
          padding: 16px;
        }
        ha-icon-button {
          position: absolute;
          right: 0;
          padding: 4px;
        }
        ha-svg-icon {
          height: 20px;
        }
        .link-button-row {
          padding: 14px;
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
