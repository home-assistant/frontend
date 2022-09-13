import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  Action,
  CountRepeat,
  RepeatAction,
  UntilRepeat,
  WhileRepeat,
} from "../../../../../data/script";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { Condition } from "../../../../lovelace/common/validate-condition";
import "../ha-automation-action";
import "../../../../../components/ha-textfield";
import type { ActionElement } from "../ha-automation-action-row";

const OPTIONS = ["count", "while", "until"] as const;

const getType = (action) => OPTIONS.find((option) => option in action);

@customElement("ha-automation-action-repeat")
export class HaRepeatAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: RepeatAction;

  @property({ type: Boolean }) public reOrderMode = false;

  public static get defaultConfig() {
    return { repeat: { count: 2, sequence: [] } };
  }

  protected render() {
    const action = this.action.repeat;

    const type = getType(action);

    return html`
      <ha-select
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.type_select"
        )}
        .value=${type}
        @selected=${this._typeChanged}
      >
        ${OPTIONS.map(
          (opt) => html`
            <mwc-list-item .value=${opt}>
              ${this.hass.localize(
                `ui.panel.config.automation.editor.actions.type.repeat.type.${opt}.label`
              )}
            </mwc-list-item>
          `
        )}
      </ha-select>
      <div>
        ${type === "count"
          ? html`
              <ha-textfield
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.type.repeat.type.count.label"
                )}
                name="count"
                .value=${(action as CountRepeat).count || "0"}
                @change=${this._countChanged}
              ></ha-textfield>
            `
          : type === "while"
          ? html` <h3>
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.actions.type.repeat.type.while.conditions`
                )}:
              </h3>
              <ha-automation-condition
                .conditions=${(action as WhileRepeat).while || []}
                .hass=${this.hass}
                @value-changed=${this._conditionChanged}
              ></ha-automation-condition>`
          : type === "until"
          ? html` <h3>
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.actions.type.repeat.type.until.conditions`
                )}:
              </h3>
              <ha-automation-condition
                .conditions=${(action as UntilRepeat).until || []}
                .hass=${this.hass}
                @value-changed=${this._conditionChanged}
              ></ha-automation-condition>`
          : ""}
      </div>
      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.sequence"
        )}:
      </h3>
      <ha-automation-action
        .actions=${action.sequence}
        .reOrderMode=${this.reOrderMode}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
  }

  private _typeChanged(ev) {
    const type = ev.target.value;

    if (!type || type === getType(this.action.repeat)) {
      return;
    }

    const value = type === "count" ? 2 : [];

    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        repeat: { [type]: value, sequence: this.action.repeat.sequence },
      },
    });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        repeat: {
          ...this.action.repeat,
          [getType(this.action.repeat)!]: value,
        },
      },
    });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Action[];
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        repeat: {
          ...this.action.repeat,
          sequence: value,
        },
      },
    });
  }

  private _countChanged(ev: CustomEvent): void {
    const newVal = (ev.target as any).value;
    if ((this.action.repeat as CountRepeat).count === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        repeat: {
          ...this.action.repeat,
          count: newVal,
        },
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-textfield {
          margin-top: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-repeat": HaRepeatAction;
  }
}
