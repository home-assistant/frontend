import { mdiDelete } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { ensureArray } from "../../../../../common/ensure-array";
import { Condition } from "../../../../../data/automation";
import { Action, ChooseAction } from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import "../ha-automation-action";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-choose")
export class HaChooseAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: ChooseAction;

  public static get defaultConfig() {
    return { choose: [{ conditions: [], sequence: [] }], default: [] };
  }

  protected render() {
    const action = this.action;

    return html`
      ${(action.choose ? ensureArray(action.choose) : []).map(
        (option, idx) => html`<ha-card>
          <mwc-icon-button
            .idx=${idx}
            @click=${this._removeOption}
            title=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.remove_option"
            )}
          >
            <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
          </mwc-icon-button>
          <div class="card-content">
            <h2>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.option",
                "number",
                idx + 1
              )}:
            </h2>
            <h3>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.conditions"
              )}:
            </h3>
            <ha-automation-condition
              .conditions=${option.conditions}
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
              .actions=${option.sequence}
              .hass=${this.hass}
              .idx=${idx}
              @value-changed=${this._actionChanged}
            ></ha-automation-action>
          </div>
        </ha-card>`
      )}
      <ha-card>
        <div class="card-actions add-card">
          <mwc-button @click=${this._addOption}>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.add_option"
            )}
          </mwc-button>
        </div>
      </ha-card>
      <h2>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.default"
        )}:
      </h2>
      <ha-automation-action
        .actions=${action.default || []}
        @value-changed=${this._defaultChanged}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
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
          margin-top: 16px;
        }
        .add-card mwc-button {
          display: block;
          text-align: center;
        }
        mwc-icon-button {
          position: absolute;
          right: 0;
          padding: 4px;
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
