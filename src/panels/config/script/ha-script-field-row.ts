import {
  mdiAppleKeyboardCommand,
  mdiDelete,
  mdiDotsVertical,
  mdiPlaylistEdit,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-automation-row";
import type { HaAutomationRow } from "../../../components/ha-automation-row";
import "../../../components/ha-card";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-menu-item";
import type { ScriptFieldSidebarConfig } from "../../../data/automation";
import type { Field } from "../../../data/script";
import { SELECTOR_SELECTOR_BUILDING_BLOCKS } from "../../../data/selector/selector_selector";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { indentStyle, overflowStyles } from "../automation/styles";
import "./ha-script-field-selector-editor";
import type HaScriptFieldSelectorEditor from "./ha-script-field-selector-editor";
import { showToast } from "../../../util/toast";

@customElement("ha-script-field-row")
export default class HaScriptFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property({ attribute: false, type: Array }) public excludeKeys: string[] =
    [];

  @property({ attribute: false }) public field!: Field;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public highlight?: boolean;

  @state() private _yamlMode = false;

  @state() private _selected = false;

  @state() private _collapsed = false;

  @state() private _selectorRowSelected = false;

  @state() private _selectorRowCollapsed = false;

  @query("ha-script-field-selector-editor")
  private _selectorEditor?: HaScriptFieldSelectorEditor;

  @query("ha-automation-row:first-of-type")
  private _fieldRowElement?: HaAutomationRow;

  @query(".selector-row ha-automation-row")
  private _selectorRowElement?: HaAutomationRow;

  protected render() {
    return html`
      <ha-card outlined>
        <ha-automation-row
          .disabled=${this.disabled}
          @click=${this._toggleSidebar}
          .selected=${this._selected}
          left-chevron
          @toggle-collapsed=${this._toggleCollapse}
          .collapsed=${this._collapsed}
          .highlight=${this.highlight}
          @delete-row=${this._onDelete}
        >
          <ha-md-button-menu
            quick
            slot="icons"
            @click=${preventDefaultStopPropagation}
            @keydown=${stopPropagation}
            @closed=${stopPropagation}
            positioning="fixed"
            anchor-corner="end-end"
            menu-corner="start-end"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-md-menu-item .clickAction=${this._toggleYamlMode}>
              <ha-svg-icon slot="start" .path=${mdiPlaylistEdit}></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
                )}
                <span class="shortcut-placeholder ${isMac ? "mac" : ""}"></span>
              </div>
            </ha-md-menu-item>
            <ha-md-menu-item
              .clickAction=${this._onDelete}
              .disabled=${this.disabled}
              class="warning"
            >
              <ha-svg-icon slot="start" .path=${mdiDelete}></ha-svg-icon>
              <div class="overflow-label">
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.actions.delete"
                )}
                ${!this.narrow
                  ? html`<span class="shortcut">
                      <span
                        >${isMac
                          ? html`<ha-svg-icon
                              slot="start"
                              .path=${mdiAppleKeyboardCommand}
                            ></ha-svg-icon>`
                          : this.hass.localize(
                              "ui.panel.config.automation.editor.ctrl"
                            )}</span
                      >
                      <span>+</span>
                      <span
                        >${this.hass.localize(
                          "ui.panel.config.automation.editor.del"
                        )}</span
                      >
                    </span>`
                  : nothing}
              </div>
            </ha-md-menu-item>
          </ha-md-button-menu>

          <h3 slot="header">${this.key}</h3>

          <slot name="icons" slot="icons"></slot>
        </ha-automation-row>
      </ha-card>
      <div
        class=${classMap({
          "selector-row": true,
          "parent-selected": this._selected,
          hidden: this._collapsed,
        })}
      >
        <ha-card>
          <ha-automation-row
            .selected=${this._selectorRowSelected}
            @click=${this._toggleSelectorSidebar}
            .collapsed=${this._selectorRowCollapsed}
            @toggle-collapsed=${this._toggleSelectorRowCollapse}
            .leftChevron=${SELECTOR_SELECTOR_BUILDING_BLOCKS.includes(
              Object.keys(this.field.selector)[0]
            )}
            .highlight=${this.highlight}
          >
            <h3 slot="header">
              ${this.hass.localize(
                `ui.components.selectors.selector.types.${Object.keys(this.field.selector)[0]}` as LocalizeKeys
              )}
              ${this.hass.localize(
                "ui.panel.config.script.editor.field.selector"
              )}
            </h3>
            <ha-md-button-menu
              quick
              slot="icons"
              @click=${preventDefaultStopPropagation}
              @keydown=${stopPropagation}
              @closed=${stopPropagation}
              positioning="fixed"
              anchor-corner="end-end"
              menu-corner="start-end"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <ha-md-menu-item
                .clickAction=${this._toggleYamlMode}
                selector-row
              >
                <ha-svg-icon
                  slot="start"
                  .path=${mdiPlaylistEdit}
                ></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.edit_${!this._yamlMode ? "yaml" : "ui"}`
                  )}
                  <span
                    class="shortcut-placeholder ${isMac ? "mac" : ""}"
                  ></span>
                </div>
              </ha-md-menu-item>
              <ha-md-menu-item
                .clickAction=${this._onDelete}
                .disabled=${this.disabled}
                class="warning"
              >
                <ha-svg-icon slot="start" .path=${mdiDelete}></ha-svg-icon>
                <div class="overflow-label">
                  ${this.hass.localize(
                    "ui.panel.config.automation.editor.actions.delete"
                  )}
                  ${!this.narrow
                    ? html`<span class="shortcut">
                        <span
                          >${isMac
                            ? html`<ha-svg-icon
                                slot="start"
                                .path=${mdiAppleKeyboardCommand}
                              ></ha-svg-icon>`
                            : this.hass.localize(
                                "ui.panel.config.automation.editor.ctrl"
                              )}</span
                        >
                        <span>+</span>
                        <span
                          >${this.hass.localize(
                            "ui.panel.config.automation.editor.del"
                          )}</span
                        >
                      </span>`
                    : nothing}
                </div>
              </ha-md-menu-item>
            </ha-md-button-menu>
          </ha-automation-row>
        </ha-card>
        ${typeof this.field.selector === "object" &&
        SELECTOR_SELECTOR_BUILDING_BLOCKS.includes(
          Object.keys(this.field.selector)[0]
        )
          ? html`
              <ha-script-field-selector-editor
                class=${this._selectorRowCollapsed ? "hidden" : ""}
                .selected=${this._selectorRowSelected}
                .hass=${this.hass}
                .field=${this.field}
                .disabled=${this.disabled}
                indent
                @value-changed=${this._selectorValueChanged}
                .narrow=${this.narrow}
              ></ha-script-field-selector-editor>
            `
          : nothing}
      </div>
    `;
  }

  private _toggleCollapse() {
    this._collapsed = !this._collapsed;
  }

  public expand() {
    this._collapsed = false;
  }

  public collapse() {
    this._collapsed = true;
  }

  public expandSelectorRow() {
    this._selectorRowCollapsed = false;
  }

  public collapseSelectorRow() {
    this._selectorRowCollapsed = true;
  }

  private _toggleSelectorRowCollapse() {
    this._selectorRowCollapsed = !this._selectorRowCollapsed;
  }

  public expandAll() {
    this.expand();
    this.expandSelectorRow();

    this._selectorEditor?.expandAll();
  }

  public collapseAll() {
    this.collapse();
    this.collapseSelectorRow();

    this._selectorEditor?.collapseAll();
  }

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      fireEvent(this, "request-close-sidebar");
      return;
    }

    this._selected = true;
    this._collapsed = false;
    this.openSidebar();
  }

  private _toggleSelectorSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selectorRowSelected) {
      fireEvent(this, "request-close-sidebar");
      return;
    }

    this._selectorRowSelected = true;
    this._selectorRowCollapsed = false;
    this.openSidebar(true);
  }

  private _selectorValueChanged(ev: CustomEvent) {
    ev.stopPropagation();

    fireEvent(this, "value-changed", {
      value: {
        ...this.field,
        key: this.key,
        ...ev.detail.value,
      },
    });
  }

  public openSidebar(selectorEditor = false): void {
    if (!selectorEditor) {
      this._selected = true;
    }

    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: (focus?: boolean) => {
        if (selectorEditor) {
          this._selectorRowSelected = false;
          if (focus) {
            this.focusSelector();
          }
        } else {
          this._selected = false;
          if (focus) {
            this.focus();
          }
        }
        fireEvent(this, "close-sidebar");
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        this.openSidebar();
      },
      delete: this._onDelete,
      config: {
        field: this.field,
        selector: selectorEditor,
        key: this.key,
        excludeKeys: this.excludeKeys,
      },
      yamlMode: this._yamlMode,
    } satisfies ScriptFieldSidebarConfig);

    if (this.narrow) {
      window.setTimeout(() => {
        this.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }, 180); // duration of transition of added padding for bottom sheet
    }
  }

  private _toggleYamlMode = (item?: HTMLElement) => {
    this._yamlMode = !this._yamlMode;

    if (item) {
      this.openSidebar(item.hasAttribute("selector-row"));
    }
  };

  private _onDelete = () => {
    fireEvent(this, "value-changed", { value: null });
    if (this._selected || this._selectorRowSelected) {
      fireEvent(this, "close-sidebar");
    }

    showToast(this, {
      message: this.hass.localize("ui.common.successfully_deleted"),
      duration: 4000,
      action: {
        text: this.hass.localize("ui.common.undo"),
        action: () => {
          fireEvent(window, "undo-change");
        },
      },
    });
  };

  public focus() {
    this._fieldRowElement?.focus();
  }

  public focusSelector() {
    this._selectorRowElement?.focus();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      indentStyle,
      overflowStyles,
      css`
        .disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .hidden {
          display: none;
        }
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
        .action-icon {
          display: none;
        }
        @media (min-width: 870px) {
          .action-icon {
            display: inline-block;
            color: var(--secondary-text-color);
            opacity: 0.9;
            margin-right: 8px;
            margin-inline-end: 8px;
            margin-inline-start: initial;
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: calc(
            var(--ha-card-border-radius, var(--ha-border-radius-lg)) - var(
                --ha-card-border-width,
                1px
              )
          );
          border-top-left-radius: calc(
            var(--ha-card-border-radius, var(--ha-border-radius-lg)) - var(
                --ha-card-border-width,
                1px
              )
          );
        }

        .warning ul {
          margin: 4px 0;
        }
        .selected_menu_item {
          color: var(--primary-color);
        }
        li[role="separator"] {
          border-bottom-color: var(--divider-color);
        }
        .selector-row {
          padding-top: 12px;
          padding-bottom: 16px;
          padding-inline-start: 16px;
          padding-inline-end: 0px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-field-row": HaScriptFieldRow;
  }
}
