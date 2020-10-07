import "../../../components/ha-yaml-editor";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { repeat } from "lit-html/directives/repeat";
import { assert } from "superstruct";
import { mdiClose, mdiGestureTap, mdiPencil } from "@mdi/js";

import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-help-tooltip";
import { computeServiceDescription } from "../../../common/service/compute_service_description";
import "../../../components/ha-service-picker";
import {
  ActionConfig,
  CallServiceActionConfig,
  ConfirmationRestrictionConfig,
  NavigateActionConfig,
  UrlActionConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import {
  actionConfigStruct,
  EditorTarget,
  GUIModeChangedEvent,
} from "../editor/types";
import { computeServiceAttributes } from "../../../common/service/compute_service_attributes";
import { LovelaceActionEditor } from "../types";
import { HuiElementEditor } from "../editor/hui-element-editor";

import "../editor/hui-detail-editor-base";

@customElement("hui-action-editor")
export class HuiActionEditor extends LitElement
  implements LovelaceActionEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public tooltipText?: string;

  @internalProperty() private _config?: ActionConfig;

  @internalProperty()
  protected _editConfirmationConfig?: ConfirmationRestrictionConfig;

  @internalProperty() protected _editConfirmationGuiModeAvailable? = true;

  @internalProperty() protected _editConfirmationGuiMode? = true;

  @query("hui-element-editor") private _cardEditorEl?: HuiElementEditor;

  public setConfig(config: ActionConfig): void {
    assert(config, actionConfigStruct);
    this._config = config;
  }

  get _navigation_path(): string {
    const config = this._config as NavigateActionConfig;
    return config.navigation_path || "";
  }

  get _url_path(): string {
    const config = this._config as UrlActionConfig;
    return config.url_path || "";
  }

  get _service(): string {
    const config = this._config as CallServiceActionConfig;
    return config.service || "";
  }

  get _service_data(): {
    entity_id?: string | [string];
    [key: string]: any;
  } {
    const config = this._config as CallServiceActionConfig;
    return config.service_data || {};
  }

  get _confirmation(): ConfirmationRestrictionConfig {
    return this._config?.confirmation || {};
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    const actions = [
      "more-info",
      "toggle",
      "navigate",
      "url",
      "call-service",
      "none",
    ];

    if (this._editConfirmationConfig) {
      return html`
        <hui-detail-editor-base
          .hass=${this.hass}
          .guiModeAvailable=${this._editConfirmationGuiModeAvailable}
          .guiMode=${this._editConfirmationGuiMode}
          @toggle-gui-mode=${this._toggleMode}
          @go-back=${this._goBack}
        >
          <span slot="title"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.card.generic.confirmation"
            )}</span
          >
          <hui-element-editor
            .hass=${this.hass}
            .value=${this._editConfirmationConfig}
            elementType="confirmation"
            @config-changed=${this._handleConfirmationConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-element-editor>
        </hui-detail-editor-base>
      `;
    }

    return html`
      <div class="dropdown">
        <paper-dropdown-menu
          .configValue=${"action"}
          @iron-select=${this._actionPicked}
        >
          <paper-listbox
            slot="dropdown-content"
            attr-for-selected="value"
            .selected=${this._config?.action ?? "default"}
          >
            <paper-item .value=${"default"}
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.actions.default_action"
              )}</paper-item
            >
            ${actions.map((action) => {
              return html`
                <paper-item .value=${action}
                  >${this.hass!.localize(
                    `ui.panel.lovelace.editor.action-editor.actions.${action}`
                  )}</paper-item
                >
              `;
            })}
          </paper-listbox>
        </paper-dropdown-menu>
        ${this.tooltipText
          ? html`
              <ha-help-tooltip .label=${this.tooltipText}></ha-help-tooltip>
            `
          : ""}
      </div>
      <div class="confirmation">
        <div>
          <ha-svg-icon .path=${mdiGestureTap}></ha-svg-icon>
          <span
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.confirmation"
            )}
            -
            ${Object.keys(this._confirmation).length > 0
              ? this.hass!.localize(
                  "ui.panel.lovelace.editor.card.generic.enabled"
                )
              : this.hass!.localize(
                  "ui.panel.lovelace.editor.action-editor.confirmation.none"
                )}</span
          >
        </div>
        <div>
          <mwc-icon-button
            aria-label=${this.hass!.localize(
              "ui.components.entity.entity-picker.edit"
            )}
            class="edit-icon"
            @click=${this._editConfirmation}
          >
            <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-icon-button
            aria-label=${this.hass!.localize(
              "ui.components.entity.entity-picker.clear"
            )}
            class="remove-icon"
            @click=${this._clearConfirmation}
          >
            <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
          </mwc-icon-button>
        </div>
      </div>
      ${Object.keys(this._confirmation).length > 0
        ? html` <div class="secondary">
            ${this._confirmation?.exemptions
              ? html`${this.hass!.localize(
                  "ui.panel.lovelace.editor.action-editor.confirmation.exempt_users"
                )}:
                ${this._confirmation.exemptions}`
              : this.hass!.localize(
                  "ui.panel.lovelace.editor.action-editor.confirmation.no_exemptions"
                )}
          </div>`
        : ""}
      ${this._config?.action === "navigate"
        ? html`
            <paper-input
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.navigation_path"
              )}
              .value=${this._navigation_path}
              .configValue=${"navigation_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this._config?.action === "url"
        ? html`
            <paper-input
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.url_path"
              )}
              .value=${this._url_path}
              .configValue=${"url_path"}
              @value-changed=${this._valueChanged}
            ></paper-input>
          `
        : ""}
      ${this._config?.action === "call-service"
        ? html`
            <ha-service-picker
              .hass=${this.hass}
              .value=${this._service}
              .configValue=${"service"}
              @value-changed=${this._valueChanged}
            ></ha-service-picker>
            ${this._service
              ? html`<div class="secondary">
                    ${computeServiceDescription(
                      this.hass,
                      this._service.split(".", 2)[0],
                      this._service.split(".", 2)[1]
                    )}
                  </div>
                  <div class="service-data-editor">
                    <ha-yaml-editor
                      .defaultValue=${this._service_data}
                      .configValue=${"service_data"}
                      @value-changed=${this._valueChanged}
                    ></ha-yaml-editor>
                  </div>
                  <table class="attributes">
                    <tr>
                      <th>
                        Parameter - Translate
                      </th>
                      <th>
                        Description - Translate
                      </th>
                      <th>
                        Example - Translate
                      </th>
                    </tr>
                    ${repeat(
                      computeServiceAttributes(
                        this.hass,
                        this._service.split(".", 2)[0],
                        this._service.split(".", 2)[1]
                      ),
                      (attribute) => attribute.key,
                      (attribute) =>
                        html`
                          <tr>
                            <td><pre>${attribute.key}</pre></td>
                            <td>${attribute.description}</td>
                            <td>${attribute.example}</td>
                          </tr>
                        `
                    )}
                  </table>`
              : ""}
          `
        : ""}
    `;
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._editConfirmationGuiMode = ev.detail.guiMode;
    this._editConfirmationGuiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _editConfirmation(): void {
    this._editConfirmationConfig = this._confirmation;
  }

  private _clearConfirmation(): void {
    if (!this._config || !this.hass) {
      return;
    }

    const newConfig = { ...this._config };
    delete newConfig.confirmation;

    fireEvent(this, "config-changed", { config: newConfig });
  }

  private _goBack(): void {
    this._editConfirmationConfig = undefined;
    this._editConfirmationGuiModeAvailable = true;
    this._editConfirmationGuiMode = true;
  }

  private _handleConfirmationConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();

    const config = ev.detail.config as ConfirmationRestrictionConfig;
    this._editConfirmationGuiModeAvailable = ev.detail.guiModeAvailable;

    if (this._confirmation === config) {
      return;
    }

    this._editConfirmationConfig = config;

    this._config = {
      ...this._config!,
      confirmation: this._editConfirmationConfig,
    };

    fireEvent(this, "config-changed", { config: this._config! });
  }

  private _actionPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }
    const item = ev.detail.item;
    const value = item.value;
    if (this._config?.action === value) {
      return;
    }
    if (value === "default") {
      fireEvent(this, "value-changed", { value: undefined });
      if (this._config?.action) {
        (this.shadowRoot!.querySelector(
          "paper-listbox"
        ) as PaperListboxElement).select(this._config.action);
      }
      return;
    }
    fireEvent(this, "config-changed", {
      config: { ...this._config, action: value },
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;
    if (this[`_${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      fireEvent(this, "config-changed", {
        config: { ...this._config, [target.configValue!]: value },
      });
    }
  }

  static get styles(): CSSResult {
    return css`
      .dropdown {
        display: flex;
      }

      .attributes th {
        text-align: left;
      }

      :host([rtl]) .attributes th {
        text-align: right;
      }

      .attributes tr {
        vertical-align: top;
        direction: ltr;
      }

      .attributes tr:nth-child(odd) {
        background-color: var(--table-row-background-color, #eee);
      }

      .attributes tr:nth-child(even) {
        background-color: var(--table-row-alternative-background-color, #eee);
      }

      .attributes td:nth-child(3) {
        white-space: pre-wrap;
        word-break: break-word;
      }

      pre {
        margin: 0;
        font-family: var(--code-font-family, monospace);
      }

      td {
        padding: 4px;
      }

      .confirmation {
        display: flex;
        align-items: center;
        text-transform: capitalize;
        justify-content: space-between;
      }

      .remove-icon,
      .edit-icon {
        --mdc-icon-button-size: 36px;
        color: var(--secondary-text-color);
      }

      .secondary {
        font-size: 12px;
        color: var(--secondary-text-color);
        padding-left: 30px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-action-editor": HuiActionEditor;
  }
}
