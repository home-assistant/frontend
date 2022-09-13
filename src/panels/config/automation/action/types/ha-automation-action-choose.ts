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
        (option, idx) => html`<ha-card>
          <ha-icon-button
            .idx=${idx}
            @click=${this._removeOption}
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.remove_option"
            )}
            .path=${mdiDelete}
          ></ha-icon-button>
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
              .reOrderMode=${this.reOrderMode}
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
              .actions=${option.sequence || []}
              .reOrderMode=${this.reOrderMode}
              .hass=${this.hass}
              .idx=${idx}
              @value-changed=${this._actionChanged}
            ></ha-automation-action>
          </div>
        </ha-card>`
      )}
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.add_option"
        )}
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
              .actions=${action.default || []}
              .reOrderMode=${this.reOrderMode}
              @value-changed=${this._defaultChanged}
              .hass=${this.hass}
            ></ha-automation-action>
          `
        : html` <div class="link-button-row">
            <button class="link" @click=${this._addDefault}>
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
        .add-card mwc-button {
          display: block;
          text-align: center;
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
