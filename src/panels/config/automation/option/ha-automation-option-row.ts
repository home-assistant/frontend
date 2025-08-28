import { consume } from "@lit/context";
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
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ensureArray } from "../../../../common/array/ensure-array";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-automation-row";
import "../../../../components/ha-card";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-button-menu";
import "../../../../components/ha-md-menu-item";
import "../../../../components/ha-svg-icon";
import type {
  Condition,
  OptionSidebarConfig,
} from "../../../../data/automation";
import { describeCondition } from "../../../../data/automation_i18n";
import { fullEntitiesContext } from "../../../../data/context";
import type { EntityRegistryEntry } from "../../../../data/entity_registry";
import type { Action, Option } from "../../../../data/script";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import "../action/ha-automation-action";
import type HaAutomationAction from "../action/ha-automation-action";
import "../condition/ha-automation-condition";
import type HaAutomationCondition from "../condition/ha-automation-condition";
import { editorStyles, indentStyle, rowStyles } from "../styles";

@customElement("ha-automation-option-row")
export default class HaAutomationOptionRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public option?: Option;

  @property({ attribute: false }) public defaultActions?: Action[];

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Number }) public index!: number;

  @property({ type: Boolean }) public first = false;

  @property({ type: Boolean }) public last = false;

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @state() private _expanded = false;

  @state() private _selected = false;

  @state() private _collapsed = true;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  @query("ha-automation-condition")
  private _conditionElement?: HaAutomationCondition;

  @query("ha-automation-action")
  private _actionElement?: HaAutomationAction;

  private _expandedChanged(ev) {
    if (ev.currentTarget.id !== "option") {
      return;
    }
    this._expanded = ev.detail.expanded;
  }

  private _getDescription() {
    const conditions = ensureArray<Condition | string>(this.option!.conditions);
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

  private _renderRow() {
    return html`
      <h3 slot="header">
        ${this.option
          ? `${this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.option",
              { number: this.index + 1 }
            )}: ${this.option.alias || (this._expanded ? "" : this._getDescription())}`
          : this.hass.localize(
              "ui.panel.config.automation.editor.actions.type.choose.default"
            )}
      </h3>

      <slot name="icons" slot="icons"></slot>

      ${this.option
        ? html`
            <ha-md-button-menu
              slot="icons"
              @click=${preventDefaultStopPropagation}
              @closed=${stopPropagation}
              @keydown=${stopPropagation}
              positioning="fixed"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>

              ${!this.optionsInSidebar
                ? html`
                    <ha-md-menu-item
                      @click=${this._renameOption}
                      .disabled=${this.disabled}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.rename"
                      )}
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiRenameBox}
                      ></ha-svg-icon>
                    </ha-md-menu-item>

                    <ha-md-menu-item
                      @click=${this._duplicateOption}
                      .disabled=${this.disabled}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.automation.editor.actions.duplicate"
                      )}
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiContentDuplicate}
                      ></ha-svg-icon>
                    </ha-md-menu-item>
                  `
                : nothing}

              <ha-md-menu-item
                @click=${this._moveUp}
                .disabled=${this.disabled || this.first}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_up"
                )}
                <ha-svg-icon slot="graphic" .path=${mdiArrowUp}></ha-svg-icon>
              </ha-md-menu-item>

              <ha-md-menu-item
                @click=${this._moveDown}
                .disabled=${this.disabled || this.last}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.move_down"
                )}
                <ha-svg-icon slot="graphic" .path=${mdiArrowDown}></ha-svg-icon>
              </ha-md-menu-item>

              ${!this.optionsInSidebar
                ? html`<ha-md-menu-item
                    @click=${this._removeOption}
                    class="warning"
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
                  </ha-md-menu-item>`
                : nothing}
            </ha-md-button-menu>
          `
        : nothing}
      ${!this.optionsInSidebar ? this._renderContent() : nothing}
    `;
  }

  private _renderContent() {
    return html`<div
      class=${classMap({
        "card-content": true,
        indent: this.optionsInSidebar,
        selected: this._selected,
        hidden: this.optionsInSidebar && this._collapsed,
      })}
    >
      ${this.option
        ? html`
            <h4 class="top">
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
              .optionsInSidebar=${this.optionsInSidebar}
            ></ha-automation-condition>
          `
        : nothing}
      <h4 class=${this.option ? "" : "top"}>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.sequence"
        )}:
      </h4>
      <ha-automation-action
        .actions=${(this.option
          ? ensureArray(this.option.sequence) || []
          : this.defaultActions
            ? ensureArray(this.defaultActions) || []
            : []) as Action[]}
        .disabled=${this.disabled}
        .hass=${this.hass}
        .narrow=${this.narrow}
        @value-changed=${this._actionChanged}
        .optionsInSidebar=${this.optionsInSidebar}
      ></ha-automation-action>
    </div>`;
  }

  protected render() {
    if (!this.option && !this.defaultActions) return nothing;

    return html`
      <ha-card outlined class=${this._selected ? "selected" : ""}>
        ${this.optionsInSidebar
          ? html`<ha-automation-row
              left-chevron
              .collapsed=${this._collapsed}
              .selected=${this._selected}
              @click=${this._toggleSidebar}
              @toggle-collapsed=${this._toggleCollapse}
              >${this._renderRow()}</ha-automation-row
            >`
          : html`
              <ha-expansion-panel
                left-chevron
                @expanded-changed=${this._expandedChanged}
                id="option"
              >
                ${this._renderRow()}
              </ha-expansion-panel>
            `}
      </ha-card>

      ${this.optionsInSidebar ? this._renderContent() : nothing}
    `;
  }

  private _duplicateOption = () => {
    fireEvent(this, "duplicate");
  };

  private _moveUp() {
    fireEvent(this, "move-up");
  }

  private _moveDown() {
    fireEvent(this, "move-down");
  }

  private _removeOption = () => {
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
      confirm: () => {
        fireEvent(this, "value-changed", {
          value: null,
        });
        if (this._selected) {
          fireEvent(this, "close-sidebar");
        }
      },
    });
  };

  private _renameOption = async () => {
    const alias = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.change_alias"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.automation.editor.actions.type.choose.alias"
      ),
      inputType: "string",
      placeholder: capitalizeFirstLetter(this._getDescription()),
      defaultValue: this.option!.alias,
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
  };

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = ev.detail.value as Condition[];
    const value = { ...this.option, conditions: conditions };
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _actionChanged(ev: CustomEvent) {
    if (this.defaultActions) {
      return;
    }
    ev.stopPropagation();
    const actions = ev.detail.value as Action[];
    const value = { ...this.option, sequence: actions };
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      this._selected = false;
      fireEvent(this, "close-sidebar");
      return;
    }
    this.openSidebar();
  }

  public openSidebar(): void {
    fireEvent(this, "open-sidebar", {
      close: () => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
      },
      rename: () => {
        this._renameOption();
      },
      toggleYamlMode: () => false, // no yaml mode for options
      delete: this._removeOption,
      duplicate: this._duplicateOption,
      defaultOption: !!this.defaultActions,
    } satisfies OptionSidebarConfig);
    this._selected = true;
    this._collapsed = false;

    if (this.narrow) {
      this.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  }

  public expand() {
    if (this.optionsInSidebar) {
      this._collapsed = false;
      return;
    }

    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  public collapse() {
    this._collapsed = true;
  }

  public expandAll() {
    this.expand();

    this._conditionElement?.expandAll();
    this._actionElement?.expandAll();
  }

  public collapseAll() {
    this.collapse();

    this._conditionElement?.collapseAll();
    this._actionElement?.collapseAll();
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  public isSelected() {
    return this._selected;
  }

  static get styles(): CSSResultGroup {
    return [
      rowStyles,
      editorStyles,
      indentStyle,
      css`
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        h4 {
          color: var(--ha-color-text-secondary);
        }
        h4 {
          margin-bottom: 8px;
        }
        h4.top {
          margin-top: 0;
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
