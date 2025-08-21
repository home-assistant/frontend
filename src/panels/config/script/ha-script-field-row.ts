import { mdiDelete, mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-automation-row";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-menu-item";
import type { ScriptFieldSidebarConfig } from "../../../data/automation";
import type { Field } from "../../../data/script";
import { SELECTOR_SELECTOR_BUILDING_BLOCKS } from "../../../data/selector/selector_selector";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./ha-script-field-selector-editor";

@customElement("ha-script-field-row")
export default class HaScriptFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property({ attribute: false, type: Array }) public excludeKeys: string[] =
    [];

  @property({ attribute: false }) public field!: Field;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _yamlMode = false;

  @state() private _selected = false;

  @state() private _collapsed = false;

  @state() private _selectorRowSelected = false;

  @state() private _selectorRowCollapsed = false;

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
        >
          <h3 slot="header">${this.key}</h3>

          <slot name="icons" slot="icons"></slot>
          <ha-md-button-menu
            slot="icons"
            @click=${preventDefaultStopPropagation}
            @keydown=${stopPropagation}
            @closed=${stopPropagation}
            positioning="fixed"
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>

            <ha-md-menu-item
              class="warning"
              .clickAction=${this._onDelete}
              .disabled=${this.disabled}
            >
              ${this.hass.localize(
                "ui.panel.config.automation.editor.actions.delete"
              )}
              <ha-svg-icon
                class="warning"
                slot="graphic"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-md-menu-item>
          </ha-md-button-menu>
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
          >
            <h3 slot="header">
              ${this.hass.localize(
                `ui.components.selectors.selector.types.${Object.keys(this.field.selector)[0]}` as LocalizeKeys
              )}
              ${this.hass.localize(
                "ui.panel.config.script.editor.field.selector"
              )}
            </h3>
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

  private _toggleSelectorRowCollapse() {
    this._selectorRowCollapsed = !this._selectorRowCollapsed;
  }

  private _toggleSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selected) {
      this._selected = false;
      fireEvent(this, "close-sidebar");
      return;
    }

    this._selected = true;
    this.openSidebar();
  }

  private _toggleSelectorSidebar(ev: Event) {
    ev?.stopPropagation();

    if (this._selectorRowSelected) {
      this._selectorRowSelected = false;
      fireEvent(this, "close-sidebar");
      return;
    }

    this._selectorRowSelected = true;
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

  private _scrollIntoView = () => {
    this.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  };

  public openSidebar(selectorEditor = false): void {
    if (!selectorEditor) {
      this._selected = true;
    }

    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: () => {
        if (selectorEditor) {
          this._selectorRowSelected = false;
        } else {
          this._selected = false;
        }
        fireEvent(this, "close-sidebar");
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        return this._yamlMode;
      },
      delete: this._onDelete,
      config: {
        field: this.field,
        selector: selectorEditor,
        key: this.key,
        excludeKeys: this.excludeKeys,
      },
      yamlMode: this._yamlMode,
      scrollIntoView: this._scrollIntoView,
    } satisfies ScriptFieldSidebarConfig);
  }

  private _toggleYamlMode = () => {
    this._yamlMode = !this._yamlMode;
  };

  private _onDelete = () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.script.editor.field_delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.script.editor.field_delete_confirm_text"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        fireEvent(this, "value-changed", { value: null });
        if (this._selected || this._selectorRowSelected) {
          fireEvent(this, "close-sidebar");
        }
      },
    });
  };

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
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
          border-top-left-radius: calc(
            var(--ha-card-border-radius, 12px) - var(
                --ha-card-border-width,
                1px
              )
          );
        }

        ha-md-menu-item[disabled] {
          --mdc-theme-text-primary-on-background: var(--disabled-text-color);
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
        :host([highlight]) ha-card {
          --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
          --shadow-focus: 0 0 0 1px var(--state-inactive-color);
          border-color: var(--state-inactive-color);
          box-shadow: var(--shadow-default), var(--shadow-focus);
        }
        .selector-row {
          margin-left: 12px;
          padding: 12px 4px 16px 16px;
          margin-right: -4px;
          border-left: 2px solid var(--ha-color-border-neutral-quiet);
        }
        .selector-row.parent-selected {
          border-color: var(--primary-color);
          background-color: var(--ha-color-fill-primary-quiet-resting);
          border-top-right-radius: var(--ha-border-radius-xl);
          border-bottom-right-radius: var(--ha-border-radius-xl);
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
