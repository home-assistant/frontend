import { mdiDelete, mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { preventDefaultStopPropagation } from "../../../common/dom/prevent_default_stop_propagation";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-alert";
import "../../../components/ha-automation-row";
import "../../../components/ha-card";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-yaml-editor";
import type { Field } from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

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

  protected render() {
    return html`
      <ha-card outlined>
        <ha-automation-row
          .disabled=${this.disabled}
          @click=${this._toggleSidebar}
          .selected=${this._selected}
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
    `;
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
    if (this.narrow) {
      this.scrollIntoView();
    }

    fireEvent(this, "open-sidebar", {
      save: (value) => {
        fireEvent(this, "value-changed", { value });
      },
      close: () => {
        this._selected = false;
        fireEvent(this, "close-sidebar");
      },
      rename: () => {
        // field cannot be renamed
      },
      toggleYamlMode: () => {
        this._toggleYamlMode();
        return this._yamlMode;
      },
      disable: () => {
        // field cannot be disabled
      },
      delete: this._onDelete,
      config: {
        field: this.field,
        key: this.key,
        excludeKeys: this.excludeKeys,
      },
      type: "script_field",
      uiSupported: true,
      yamlMode: this._yamlMode,
    });
    this._selected = true;
  }

  private _toggleYamlMode = () => {
    this._yamlMode = !this._yamlMode;
  };

  private _onDelete() {
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
      },
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-field-row": HaScriptFieldRow;
  }
}
