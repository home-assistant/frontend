import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

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
import memoizeOne from "memoize-one";
import { assert } from "superstruct";

import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-help-tooltip";
import "../../../components/ha-service-picker";
import {
  ConfirmationRestrictionConfig,
  RestrictionConfig,
} from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { confirmationConfigStruct, EditorTarget } from "../editor/types";
import { fetchUsers, User } from "../../../data/user";
import { compare } from "../../../common/string/compare";
import type { HaSwitch } from "../../../components/ha-switch";
import { LovelaceConfirmationEditor } from "../types";

import "../../../components/ha-switch";
import "../../../components/user/ha-user-badge";

@customElement("hui-confirmation-editor")
export class HuiConfirmationEditor extends LitElement
  implements LovelaceConfirmationEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _config?: ConfirmationRestrictionConfig;

  @internalProperty() private _users!: User[];

  public setConfig(config: ConfirmationRestrictionConfig): void {
    assert(config, confirmationConfigStruct);
    this._config = config;
  }

  private _sortedUsers = memoizeOne((users: User[]) => {
    return users.sort((a, b) => compare(a.name, b.name));
  });

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchUsers(this.hass).then((users) => {
      this._users = users.filter((user) => !user.system_generated);
      fireEvent(this, "iron-resize");
    });
  }

  get _text(): string {
    return this._config?.text || "";
  }

  get _exemptions(): RestrictionConfig[] {
    return this._config?.exemptions || [];
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._users) {
      return html``;
    }

    return html` <paper-input
        label=${this.hass!.localize(
          "ui.panel.lovelace.editor.action-editor.confirmation.text"
        )}
        .value=${this._text}
        .configValue=${"text"}
        @value-changed=${this._valueChanged}
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
      )}`;
  }

  private _checkUser(userId: string): boolean {
    return this._exemptions.some((u) => u.user === userId);
  }

  private _userChanged(ev: Event): void {
    const userId = (ev.currentTarget as any).userId;
    const checked = (ev.currentTarget as HaSwitch).checked;

    let newExemptions = [...this._exemptions];

    if (checked === true) {
      const newEntry: RestrictionConfig = {
        user: userId,
      };
      newExemptions.push(newEntry);
    } else {
      newExemptions = (newExemptions as RestrictionConfig[]).filter(
        (c) => c.user !== userId
      );
    }

    fireEvent(this, "config-changed", {
      config: { ...this._config, exemptions: newExemptions },
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
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-confirmation-editor": HuiConfirmationEditor;
  }
}
