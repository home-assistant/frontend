import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDelete, mdiDotsVertical } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-icon-button";
import { Field } from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { SchemaUnion } from "../../../components/ha-form/types";

const SCHEMA = [
  {
    name: "name",
    selector: { text: {} },
  },
  {
    name: "description",
    selector: { text: {} },
  },
  {
    name: "required",
    selector: { boolean: {} },
  },
  {
    name: "example",
    selector: { text: {} },
  },
  {
    name: "default",
    selector: { object: {} },
  },
  {
    name: "selector",
    selector: { object: {} },
  },
] as const;

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-script-field-row")
export default class HaScriptFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property() public field!: Field;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`
      <ha-card outlined>
        <ha-expansion-panel leftChevron>
          <h3 slot="header">${this.key}</h3>

          <slot name="icons" slot="icons"></slot>
          <ha-button-menu
            slot="icons"
            @action=${this._handleAction}
            @click=${preventDefault}
            fixed
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <mwc-list-item
              class="warning"
              graphic="icon"
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
            </mwc-list-item>
          </ha-button-menu>
          <div
            class=${classMap({
              "card-content": true,
            })}
          >
            <ha-form
              .schema=${SCHEMA}
              .data=${this.field}
              .hass=${this.hass}
              .disabled=${this.disabled}
              .computeLabel=${this._computeLabelCallback}
              @value-changed=${this._valueChanged}
            ></ha-form>
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._onDelete();
        break;
    }
  }

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

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };
    fireEvent(this, "value-changed", { value });
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string => {
    switch (schema.name) {
      default:
        return this.hass.localize(
          `ui.panel.config.script.editor.field.${schema.name}`
        );
    }
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
          }
        }
        .card-content {
          padding: 16px;
        }
        .disabled-bar {
          background: var(--divider-color, #e0e0e0);
          text-align: center;
          border-top-right-radius: var(--ha-card-border-radius);
          border-top-left-radius: var(--ha-card-border-radius);
        }

        mwc-list-item[disabled] {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-field-row": HaScriptFieldRow;
  }
}
