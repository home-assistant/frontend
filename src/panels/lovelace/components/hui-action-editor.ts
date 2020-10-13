import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-input/paper-textarea";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import type { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { repeat } from "lit-html/directives/repeat";
import { assert } from "superstruct";
import { mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal } from "@mdi/js";

import { fireEvent } from "../../../common/dom/fire_event";
import {
  ActionConfig,
  CallServiceActionConfig,
  ConfirmationRestrictionConfig,
  NavigateActionConfig,
  RestrictionConfig,
  UrlActionConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { actionConfigStruct, EditorTarget } from "../editor/types";
import { computeServiceAttributes } from "../../../common/service/compute_service_attributes";
import { computeServiceDescription } from "../../../common/service/compute_service_description";

import "../../../components/ha-yaml-editor";
import "../../../components/ha-service-picker";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-switch";
import "../../../components/user/ha-user-badge";
import { fetchUsers, User } from "../../../data/user";
import memoizeOne from "memoize-one";
import { compare } from "../../../common/string/compare";
import type { HaSwitch } from "../../../components/ha-switch";

@customElement("hui-action-editor")
export class HuiActionEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public tooltipText?: string;

  @internalProperty() private _config?: ActionConfig;

  @internalProperty() private _editConfirmation?: boolean;

  @internalProperty() private _users!: User[];

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

  get _confirmation(): ConfirmationRestrictionConfig | boolean {
    return this._config?.confirmation || false;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchUsers(this.hass).then((users) => {
      this._users = users.filter((user) => !user.system_generated);
    });
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
              >${this.hass.localize(
                "ui.panel.lovelace.editor.action-editor.actions.default_action"
              )}</paper-item
            >
            ${actions.map((action) => {
              return html`
                <paper-item .value=${action}
                  >${this.hass.localize(
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
        <span
          >${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.confirmation"
          )}
        </span>
        <div>
          <ha-switch
            .checked=${this._confirmation !== false}
            .configValue=${"confirmation"}
            @change=${this._change}
          ></ha-switch>
          <mwc-icon-button
            .label=${this.hass.localize(
              "ui.components.entity.entity-picker.edit"
            )}
            class="edit-icon"
            @click=${this._toggleConfirmation}
          >
            <ha-svg-icon
              .path=${this._editConfirmation
                ? mdiUnfoldLessHorizontal
                : mdiUnfoldMoreHorizontal}
            ></ha-svg-icon>
          </mwc-icon-button>
        </div>
      </div>
      ${this._editConfirmation
        ? html` <paper-input
              label=${this.hass!.localize(
                "ui.panel.lovelace.editor.action-editor.confirmation.text"
              )}
              .value=${typeof this._confirmation === "object"
                ? this._confirmation.text
                : ""}
              .configValue=${"text"}
              @value-changed=${this._confirmationValueChanged}
            ></paper-input>
            <p>
              ${this.hass.localize(
                "ui.panel.lovelace.editor.action-editor.confirmation.select_users"
              )}
            </p>
            ${this._sortedUsers(this._users).map(
              (user) => html`
                <paper-icon-item>
                  <ha-user-badge
                    slot="item-icon"
                    .hass=${this.hass}
                    .user=${user}
                  ></ha-user-badge>
                  <paper-item-body>${user.name}</paper-item-body>
                  <ha-switch
                    .userId=${user.id}
                    @change=${this._userChanged}
                    .checked=${this._checkUser(user.id)}
                  ></ha-switch>
                </paper-icon-item>
              `
            )}`
        : ""}
      ${this._config?.action === "navigate"
        ? html`
            <paper-input
              label=${this.hass.localize(
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
              label=${this.hass.localize(
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
                        ${this.hass.localize(
                          "ui.common.services.column_parameter"
                        )}
                      </th>
                      <th>
                        ${this.hass.localize(
                          "ui.common.services.column_description"
                        )}
                      </th>
                      <th>
                        ${this.hass.localize(
                          "ui.common.services.column_example"
                        )}
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

  private _checkUser(userId: string): boolean | undefined {
    return typeof this._confirmation === "object"
      ? this._confirmation.exemptions?.some((u) => u.user === userId)
      : false;
  }

  private _userChanged(ev: Event): void {
    if (!this._config) {
      return;
    }

    const userId = (ev.currentTarget as any).userId;
    const checked = (ev.currentTarget as HaSwitch).checked;

    let exemptions =
      typeof this._confirmation === "object"
        ? this._confirmation?.exemptions || []
        : [];

    if (checked === true) {
      const newEntry: RestrictionConfig = {
        user: userId,
      };
      exemptions.push(newEntry);
    } else {
      exemptions = (exemptions as RestrictionConfig[]).filter(
        (c) => c.user !== userId
      );
    }

    fireEvent(this, "config-changed", {
      config: {
        ...this._config,
        confirmation:
          typeof this._confirmation === "object"
            ? { ...this._confirmation, exemptions }
            : { exemptions },
      },
    });
  }

  private _sortedUsers = memoizeOne((users: User[]) => {
    return users.sort((a, b) => compare(a.name, b.name));
  });

  private _toggleConfirmation(): void {
    this._editConfirmation = !this._editConfirmation;
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

  private _confirmationValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target! as EditorTarget;
    const value = ev.detail.value;
    if (this._confirmation[`${target.configValue}`] === value) {
      return;
    }
    if (target.configValue) {
      fireEvent(this, "config-changed", {
        config: {
          ...this._config,
          confirmation:
            typeof this._confirmation === "object"
              ? { ...this._confirmation, [target.configValue!]: value }
              : { [target.configValue!]: value },
        },
      });
    }
  }

  private _change(ev: Event) {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as EditorTarget;
    const value = target.checked;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    fireEvent(this, "config-changed", {
      config: {
        ...this._config,
        [target.configValue!]: value,
      },
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

      .confirmation ha-switch {
        padding-top: 10px;
      }

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
