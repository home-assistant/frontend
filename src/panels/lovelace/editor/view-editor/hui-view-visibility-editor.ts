import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "../config-elements/config-elements-style";
import { LovelaceViewConfig, ShowViewConfig } from "../../../../data/lovelace";

import { fetchUsers, User } from "../../../../data/user";
import memoizeOne from "memoize-one";
import { compare } from "../../../../common/string/compare";
import { HaSwitch } from "../../../../components/ha-switch";

declare global {
  interface HASSDomEvents {
    "view-visibility-changed": {
      visible: ShowViewConfig[];
    };
  }
}

@customElement("hui-view-visibility-editor")
export class HuiViewVisibilityEditor extends LitElement {
  set config(config: LovelaceViewConfig) {
    this._config = config;
    this._visible = this._config.visible;
  }

  @property() public hass!: HomeAssistant;
  @property() public _config!: LovelaceViewConfig;
  @property() private _users!: User[];
  @property() private _visible?: boolean | ShowViewConfig[];

  private _sortedUsers = memoizeOne((users: User[]) => {
    return users
      .filter((user) => !user.system_generated)
      .sort((a, b) => compare(a.name, b.name));
  });

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchUsers(this.hass).then((users) => {
      this._users = users;
      // how can I resize and reposition dialog? Should I use `iron-resize` event?
    });
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._users) {
      return html``;
    }

    return html`
      ${configElementStyle}
      <div class="card-config">
        <span>Select which users should have access to this view</span>

        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-switch
              .userId="${user.id}"
              @change=${this.valChange}
              .checked=${this.checkUser(user.id)}
              >${user.name}</ha-switch
            >
          `
        )}
      </div>
    `;
  }

  protected checkUser(userId: string): boolean {
    if (this._visible === undefined) {
      return true;
    }
    if (typeof this._visible === "boolean") {
      return this._visible as boolean;
    }
    return (this._visible as ShowViewConfig[]).some((u) => u.user === userId);
  }

  private valChange(ev: Event): void {
    const userId = (ev.currentTarget as any).userId;
    const checked = (ev.currentTarget as HaSwitch).checked;

    if (this._visible === undefined) {
      this._visible = true;
    }

    let newVisible: ShowViewConfig[] = [];

    if (typeof this._visible === "boolean") {
      const lastValue = this._visible as boolean;
      if (lastValue === true) {
        newVisible = this._users.map((u) => {
          return {
            user: u.id,
          };
        });
      }
    } else {
      newVisible = [...this._visible];
    }

    if (checked === true) {
      const newEntry: ShowViewConfig = {
        user: userId,
      };
      newVisible = [...newVisible, newEntry];
    } else {
      newVisible = (newVisible as ShowViewConfig[]).filter(
        (c) => c.user !== userId
      );
    }

    // this removes users that doesn't exists in system but had view permissions
    this._visible = newVisible.filter((c) =>
      this._users.some((u) => u.id === c.user)
    );

    fireEvent(this, "view-visibility-changed", { visible: this._visible });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-visibility-editor": HuiViewVisibilityEditor;
  }
}
