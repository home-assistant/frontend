import { consume } from "@lit/context";
import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";

import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiRenameBox,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ensureArray } from "../../../../common/array/ensure-array";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import type { Condition } from "../../../../data/automation";
import { describeCondition } from "../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import type { Action, Option } from "../../../../data/script";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../action/ha-automation-action";
import "../condition/ha-automation-condition";

@customElement("ha-automation-option-row")
export default class HaAutomationOptionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public option!: Option;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Number }) public index!: number;

  @property({ type: Boolean }) public first = false;

  @property({ type: Boolean }) public last = false;

  @state() private _expanded = false;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _expandedChanged(ev) {
    if (ev.currentTarget.id !== "option") {
      return;
    }
    this._expanded = ev.detail.expanded;
  }

  private _getDescription() {
    const conditions = ensureArray<Condition | string>(this.option.conditions);
    if (!conditions || conditions.length === 0) {
      return this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.no_conditions"
      );
    }
    let str = "";
    if (typeof conditions[0] === "string") {
      str += conditions[0];
    } else {
      str += describeCondition(conditions[0], this.hass, this._entityReg);
    }
    if (conditions.length > 1) {
      str += this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.option_description_additional",
        { numberOfAdditionalConditions: conditions.length - 1 }
      );
    }
    return str;
  }

  protected render() {
    if (!this.option) return nothing;

    return html`
      <ha-card outlined>
        <ha-expansion-panel
          left-chevron
          @expanded-changed=${this._expandedChanged}
          id="option"
        >
          <h3 slot="header">
            ${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.option",
              { number: this.index + 1 }
            )}:
            ${this.option.alias ||
            (this._expanded ? "" : this._getDescription())}
          </h3>

          <slot name="icons" slot="icons"></slot>

          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @click=${preventDefault}
            @closed=${stopPropagation}
            fixed
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.rename"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item graphic="icon" .disabled=${this.disabled}>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.duplicate"
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiContentDuplicate}
              ></ha-svg-icon>
            </ha-list-item>

            <ha-list-item
              graphic="icon"
              .disabled=${this.disabled || this.first}
            >
              ${this.hass.localize("ui.panel.config.automation.editor.move_up")}
              <ha-svg-icon slot="graphic" .path=${mdiArrowUp}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item
              graphic="icon"
              .disabled=${this.disabled || this.last}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.move_down"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiArrowDown}></ha-svg-icon>
            </ha-list-item>

            <ha-list-item
              class="warning"
              graphic="icon"
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.remove_option"
              )}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>

          <div class="card-content">
            <h4>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.conditions"
              )}:
            </h4>
            <ha-automation-condition
              .conditions=${ensureArray<string | Condition>(
                this.option.conditions
              )}
              .disabled=${this.disabled}
              .hass=${this.hass}
              .narrow=${this.narrow}
              @value-changed=${this._conditionChanged}
            ></ha-automation-condition>
            <h4>
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.choose.sequence"
              )}:
            </h4>
            <ha-automation-action
              .actions=${ensureArray(this.option.sequence) || []}
              .disabled=${this.disabled}
              .hass=${this.hass}
              .narrow=${this.narrow}
              @value-changed=${this._actionChanged}
            ></ha-automation-action>
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._renameOption();
        break;
      case 1:
        fireEvent(this, "duplicate");
        break;
      case 2:
        fireEvent(this, "move-up");
        break;
      case 3:
        fireEvent(this, "move-down");
        break;
      case 4:
        this._removeOption();
        break;
    }
  }

  private _removeOption() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.automation.editor.actions.delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () =>
        fireEvent(this, "value-changed", {
          value: null,
        }),
    });
  }

  private async _renameOption(): Promise<void> {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(this._getDescription()),
      defaultValue: this.option.alias,
      confirmText: this.hass.localize("ui.common.submit"),
    });
    if (alias !== null) {
      const value = { ...this.option };
      if (alias === "") {
        delete value.alias;
      } else {
        value.alias = alias;
      }
      fireEvent(this, "value-changed", {
        value,
      });
    }
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = ev.detail.value as Condition[];
    const value = { ...this.option, conditions: conditions };
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _actionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const actions = ev.detail.value as Action[];
    const value = { ...this.option, sequence: actions };
    fireEvent(this, "value-changed", {
      value,
    });
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button-menu,
        ha-icon-button {
          --mdc-theme-text-primary-on-background: var(--primary-text-color);
        }
        .disabled {
          opacity: 0.5;
          pointer-events: none;
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
        .card-content {
          padding: 16px;
        }

        ha-list-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
        }
        ha-list-item.hidden {
          display: none;
        }
        .warning ul {
          margin: 4px 0;
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-option-row": HaAutomationOptionRow;
  }
}
