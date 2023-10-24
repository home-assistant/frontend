import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiCheck, mdiDelete, mdiDotsVertical } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { slugify } from "../../../common/string/slugify";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-expansion-panel";
import type { SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import "../../../components/ha-yaml-editor";
import { Field } from "../../../data/script";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

const preventDefault = (ev) => ev.preventDefault();

@customElement("ha-script-field-row")
export default class HaScriptFieldRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property() public excludeKeys: string[] = [];

  @property() public field!: Field;

  @property({ type: Boolean }) public disabled = false;

  @state() private _uiError?: Record<string, string>;

  @state() private _yamlError?: undefined | "yaml_error" | "key_not_unique";

  @state() private _yamlMode: boolean = false;

  private _errorKey?: string;

  private _schema = memoizeOne(
    (selector: any) =>
      [
        {
          name: "name",
          selector: { text: {} },
        },
        {
          name: "key",
          selector: { text: {} },
        },
        {
          name: "description",
          selector: { text: {} },
        },
        {
          name: "selector",
          selector: { object: {} },
        },
        {
          name: "default",
          selector: selector && typeof selector === "object" ? selector : {},
        },
        {
          name: "required",
          selector: { boolean: {} },
        },
      ] as const
  );

  protected render() {
    const schema = this._schema(this.field.selector);
    const data = { ...this.field, key: this._errorKey ?? this.key };

    const yamlValue = { [this.key]: this.field };

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

            <mwc-list-item graphic="icon">
              ${this.hass.localize("ui.panel.config.automation.editor.edit_ui")}
              ${!this._yamlMode
                ? html` <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>

            <mwc-list-item graphic="icon">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.edit_yaml"
              )}
              ${this._yamlMode
                ? html`<ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>`
                : ``}
            </mwc-list-item>

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
            ${this._yamlMode
              ? html` ${this._yamlError
                    ? html`<ha-alert alert-type="error">
                        ${this.hass.localize(
                          `ui.panel.config.script.editor.field.${this._yamlError}`
                        )}
                      </ha-alert>`
                    : nothing}
                  <ha-yaml-editor
                    .hass=${this.hass}
                    .defaultValue=${yamlValue}
                    @value-changed=${this._onYamlChange}
                  ></ha-yaml-editor>`
              : html`<ha-form
                  .schema=${schema}
                  .data=${data}
                  .error=${this._uiError}
                  .hass=${this.hass}
                  .disabled=${this.disabled}
                  .computeLabel=${this._computeLabelCallback}
                  .computeError=${this._computeError}
                  @value-changed=${this._valueChanged}
                ></ha-form>`}
          </div>
        </ha-expansion-panel>
      </ha-card>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = false;
        break;
      case 1:
        this._yamlMode = true;
        break;
      case 2:
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

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    if (typeof value !== "object" || Object.keys(value).length !== 1) {
      this._yamlError = "yaml_error";
      return;
    }
    const key = Object.keys(value)[0];
    if (this.excludeKeys.includes(key)) {
      this._yamlError = "key_not_unique";
      return;
    }
    this._yamlError = undefined;

    const newValue = { ...value[key], key };

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _maybeSetKey(value): void {
    const nameChanged = value.name !== this.field.name;
    const keyChanged = value.key !== this.key;
    if (!nameChanged || keyChanged) {
      return;
    }
    const slugifyName = this.field.name
      ? slugify(this.field.name)
      : this.hass.localize("ui.panel.config.script.editor.field.field") ||
        "field";
    const regex = new RegExp(`^${slugifyName}(_\\d)?$`);
    if (regex.test(this.key)) {
      let key = !value.name
        ? this.hass.localize("ui.panel.config.script.editor.field.field") ||
          "field"
        : slugify(value.name);
      if (this.excludeKeys.includes(key)) {
        let uniqueKey = key;
        let i = 2;
        do {
          uniqueKey = `${key}_${i}`;
          i++;
        } while (this.excludeKeys.includes(uniqueKey));
        key = uniqueKey;
      }
      value.key = key;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    this._maybeSetKey(value);

    // Don't allow to set an empty key, or duplicate an existing key.
    if (!value.key || this.excludeKeys.includes(value.key)) {
      this._uiError = value.key
        ? {
            key: "key_not_unique",
          }
        : {
            key: "key_not_null",
          };
      this._errorKey = value.key ?? "";
      return;
    }
    this._errorKey = undefined;
    this._uiError = undefined;

    fireEvent(this, "value-changed", { value });
  }

  public expand() {
    this.updateComplete.then(() => {
      this.shadowRoot!.querySelector("ha-expansion-panel")!.expanded = true;
    });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      default:
        return this.hass.localize(
          `ui.panel.config.script.editor.field.${schema.name}`
        );
    }
  };

  private _computeError = (error: string) =>
    this.hass.localize(`ui.panel.config.script.editor.field.${error}` as any) ||
    error;

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
