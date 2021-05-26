import "@polymer/paper-input/paper-input";
import type { PaperListboxElement } from "@polymer/paper-listbox";
import "@polymer/paper-listbox/paper-listbox";
import { CSSResultGroup, html, LitElement } from "lit";
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
import { HomeAssistant } from "../../../../../types";
import { Condition } from "../../../../lovelace/common/validate-condition";
import "../ha-automation-action";
import { ActionElement } from "../ha-automation-action-row";

const OPTIONS = ["count", "while", "until"];

const getType = (action) => OPTIONS.find((option) => option in action);

@customElement("ha-automation-action-repeat")
export class HaRepeatAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: RepeatAction;

  public static get defaultConfig() {
    return { repeat: { count: 2, sequence: [] } };
  }

  protected render() {
    const action = this.action.repeat;

    const type = getType(action);
    const selected = type ? OPTIONS.indexOf(type) : -1;

    return html`
      <paper-dropdown-menu-light
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.type_select"
        )}
        no-animations
      >
        <paper-listbox
          slot="dropdown-content"
          .selected=${selected}
          @iron-select=${this._typeChanged}
        >
          ${OPTIONS.map(
            (opt) => html`
              <paper-item .action=${opt}>
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.actions.type.repeat.type.${opt}.label`
                )}
              </paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
      ${type === "count"
        ? html`<paper-input
            .label=${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.repeat.type.count.label"
            )}
            name="count"
            .value=${(action as CountRepeat).count || "0"}
            @value-changed=${this._countChanged}
          ></paper-input>`
        : ""}
      ${type === "while"
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
        : ""}
      ${type === "until"
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
      <h3>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.repeat.sequence"
        )}:
      </h3>
      <ha-automation-action
        .actions=${action.sequence}
        @value-changed=${this._actionChanged}
        .hass=${this.hass}
      ></ha-automation-action>
    `;
  }

  private _typeChanged(ev: CustomEvent) {
    const type = ((ev.target as PaperListboxElement)?.selectedItem as any)
      ?.action;

    if (!type || type === getType(this.action.repeat)) {
      return;
    }

    const value = type === "count" ? 2 : [];

    fireEvent(this, "value-changed", {
      value: {
        repeat: { [type]: value, sequence: this.action.repeat.sequence },
      },
    });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value as Condition[];
    fireEvent(this, "value-changed", {
      value: {
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
        repeat: {
          ...this.action.repeat,
          sequence: value,
        },
      },
    });
  }

  private _countChanged(ev: CustomEvent): void {
    const newVal = ev.detail.value;
    if ((this.action.repeat as CountRepeat).count === newVal) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: {
        repeat: {
          ...this.action.repeat,
          count: newVal,
        },
      },
    });
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-repeat": HaRepeatAction;
  }
}
