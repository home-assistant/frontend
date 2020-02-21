import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import { EditorTarget } from "../types";
import { HomeAssistant } from "../../../../types";
import { fireEvent } from "../../../../common/dom/fire_event";
import { configElementStyle } from "../config-elements/config-elements-style";
import { LovelaceViewConfig, ShowViewConfig } from "../../../../data/lovelace";
import { slugify } from "../../../../common/string/slugify";

import "../../components/hui-theme-select-editor";
import "../../../../components/ha-switch";

import { fetchUsers, User } from "../../../../data/user";
import memoizeOne from "memoize-one";
import { compare } from "../../../../common/string/compare";

declare global {
  interface HASSDomEvents {
    "view-visibility-config-changed": {
      config: LovelaceViewConfig;
    };
  }
}

@customElement("hui-view-visibility-editor")
export class HuiViewVisibilityEditor extends LitElement {
  get _path(): string {
    if (!this._config) {
      return "";
    }
    return this._config.path || "";
  }

  get _title(): string {
    if (!this._config) {
      return "";
    }
    return this._config.title || "";
  }

  get _icon(): string {
    if (!this._config) {
      return "";
    }
    return this._config.icon || "";
  }

  get _theme(): string {
    if (!this._config) {
      return "";
    }
    return this._config.theme || "Backend-selected";
  }

  get _panel(): boolean {
    if (!this._config) {
      return false;
    }
    return this._config.panel || false;
  }

  get _visible(): boolean | ShowViewConfig[] {
    if (!this._config) {
      return true;
    }
    return this._config.visible || true;
  }

  set config(config: LovelaceViewConfig) {
    this._config = config;

    console.log(this._config);
  }

  static get styles(): CSSResult {
    return css`
      .panel {
        color: var(--secondary-text-color);
      }
    `;
  }
  @property() public hass!: HomeAssistant;
  @property() public isNew!: boolean;
  @property() private _config!: LovelaceViewConfig;
  private _suggestedPath = false;

  private _users: User[] = [];

  private _sortedUsers = memoizeOne((users?: User[]) => {
    if (!users) {
      return [];
    }

    return users
      .filter((user) => !user.system_generated)
      .sort((a, b) => compare(a.name, b.name));
  });

  protected async _loadData() {
    this._users = await fetchUsers(this.hass);
    console.log(this._users);
  }

  protected render(): TemplateResult {
    this._loadData();
    if (!this.hass || !this._users) {
      return html``;
    }

    console.log(this._visible);

    return html`
      ${configElementStyle}
      <div class="card-config">
        <span class="panel"
          >Which users should see this view?
          <p>Select which users should have access to this view</p></span
        >

        ${this._sortedUsers(this._users).map(
          (user) => html`
            <ha-switch>${user.name}</ha-switch>
          `
        )}
      </div>
    `;
  }

  private _valueChanged(ev: Event): void {
    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    let newConfig;

    if (target.configValue) {
      newConfig = {
        ...this._config,
        [target.configValue!]:
          target.checked !== undefined ? target.checked : target.value,
      };
    }

    fireEvent(this, "view-visibility-config-changed", { config: newConfig });
  }

  private _handleTitleBlur(ev) {
    if (
      !this.isNew ||
      this._suggestedPath ||
      this._config.path ||
      !ev.currentTarget.value
    ) {
      return;
    }

    const config = { ...this._config, path: slugify(ev.currentTarget.value) };
    fireEvent(this, "view-visibility-config-changed", { config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-visibility-editor": HuiViewVisibilityEditor;
  }
}
