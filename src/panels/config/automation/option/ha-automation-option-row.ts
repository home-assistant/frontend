import { consume } from "@lit/context";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiRenameBox,
  mdiSelection,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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

  @property({ type: Boolean, attribute: "sidebar" })
  public optionsInSidebar = false;

  @state() private _expanded = false;

  @state() private _selected = false;

  @state() private _collapsed = false;

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

  private _renderRow() {
    return html`
      <ha-svg-icon slot="leading-icon" .path=${mdiSelection}></ha-svg-icon>
      <h3 slot="header">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.option",
          { number: this.index + 1 }
        )}:
        ${this.option.alias || (this._expanded ? "" : this._getDescription())}
      </h3>

      <slot name="icons" slot="icons"></slot>

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
                <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
              </ha-md-menu-item>
            `
          : nothing}

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

        <ha-md-menu-item
          @click=${this._moveUp}
          .disabled=${this.disabled || this.first}
        >
          ${this.hass.localize("ui.panel.config.automation.editor.move_up")}
          <ha-svg-icon slot="graphic" .path=${mdiArrowUp}></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item
          @click=${this._moveDown}
          .disabled=${this.disabled || this.last}
        >
          ${this.hass.localize("ui.panel.config.automation.editor.move_down")}
          <ha-svg-icon slot="graphic" .path=${mdiArrowDown}></ha-svg-icon>
        </ha-md-menu-item>

        <ha-md-menu-item
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
        </ha-md-menu-item>
      </ha-md-button-menu>

      ${!this.optionsInSidebar ? this._renderContent() : nothing}
    `;
  }

  private _renderContent() {
    return html`<div
      class=${classMap({
        "card-content": true,
        indent: this.optionsInSidebar,
        selected: this._selected,
      })}
    >
      <h4>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.choose.conditions"
        )}:
      </h4>
      <ha-automation-condition
        .conditions=${ensureArray<string | Condition>(this.option.conditions)}
        .disabled=${this.disabled}
        .hass=${this.hass}
        .narrow=${this.narrow}
        @value-changed=${this._conditionChanged}
        .optionsInSidebar=${this.optionsInSidebar}
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
        .optionsInSidebar=${this.optionsInSidebar}
      ></ha-automation-action>
    </div>`;
  }

  protected render() {
    if (!this.option) return nothing;

    return html`
      <ha-card outlined class=${this._selected ? "selected" : ""}>
        ${this.optionsInSidebar
          ? html`<ha-automation-row
              left-chevron
              .collapsed=${this._collapsed}
              @click=${this.openSidebar}
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

      ${this.optionsInSidebar && !this._collapsed
        ? this._renderContent()
        : nothing}
    `;
  }

  private _duplicateOption() {
    fireEvent(this, "duplicate");
  }

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
        fireEvent(this, "close-sidebar");
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
    ev.stopPropagation();
    const actions = ev.detail.value as Action[];
    const value = { ...this.option, sequence: actions };
    fireEvent(this, "value-changed", {
      value,
    });
  }

  public openSidebar(ev?: CustomEvent): void {
    ev?.stopPropagation();
    if (this.narrow) {
      this.scrollIntoView();
    }

    fireEvent(this, "open-sidebar", {
      save: () => {
        // nothing to save for an option in the sidebar
      },
      close: () => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
      },
      rename: () => {
        this._renameOption();
      },
      toggleYamlMode: () => false, // no yaml mode for options
      disable: () => {
        // option cannot be disabled
      },
      delete: this._removeOption,
      config: {},
      type: "option",
      uiSupported: true,
      yamlMode: false,
    });
    this._selected = true;
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
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

        ha-card {
          transition: outline 0.2s;
        }

        ha-card.selected {
          outline: solid;
          outline-color: var(--primary-color);
          outline-offset: -2px;
          outline-width: 2px;
        }
        h3 {
          font-size: inherit;
          font-weight: inherit;
        }
        .card-content {
          padding: 16px;
        }
        .card-content.indent {
          margin-top: 0;
          margin-right: 8px;
          margin-left: 12px;
          padding: 12px 16px 16px;
          border-left: 2px solid var(--color-border-neutral-normal);
          background: transparent;
          border-bottom-right-radius: 12px;
        }
        .card-content.indent.selected {
          background-color: var(--color-fill-neutral-quiet-resting);
          border-color: var(--primary-color);
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
