import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stringCompare } from "../../../../common/string/compare";
import { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/user/ha-user-badge";
import { LovelaceViewConfig, ShowViewConfig } from "../../../../data/lovelace";
import { fetchUsers, User } from "../../../../data/user";
import { HomeAssistant } from "../../../../types";

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
    this._visible =
      this._config.visible === undefined ? true : this._config.visible;
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public _config!: LovelaceViewConfig;

  @state() private _users!: User[];

  @state() private _visible!: boolean | ShowViewConfig[];

  private _sortedUsers = memoizeOne((users: User[]) =>
    users.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    )
  );

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);

    fetchUsers(this.hass).then((users) => {
      this._users = users.filter((user) => !user.system_generated);
      fireEvent(this, "iron-resize");
    });
  }

  protected render() {
    if (!this.hass || !this._users) {
      return nothing;
    }

    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.edit_view.visibility.select_users"
        )}
      </p>
      ${this._sortedUsers(this._users).map(
        (user) => html`
          <mwc-list-item graphic="avatar" hasMeta>
            <ha-user-badge
              slot="graphic"
              .hass=${this.hass}
              .user=${user}
            ></ha-user-badge>
            <span>${user.name}</span>
            <ha-switch
              slot="meta"
              .userId=${user.id}
              @change=${this.valChange}
              .checked=${this.checkUser(user.id)}
            ></ha-switch>
          </mwc-list-item>
        `
      )}
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

    let newVisible: ShowViewConfig[] = [];

    if (typeof this._visible === "boolean") {
      const lastValue = this._visible as boolean;
      if (lastValue) {
        newVisible = this._users.map((u) => ({
          user: u.id,
        }));
      }
    } else {
      newVisible = [...this._visible];
    }

    if (checked === true) {
      const newEntry: ShowViewConfig = {
        user: userId,
      };
      newVisible.push(newEntry);
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-visibility-editor": HuiViewVisibilityEditor;
  }
}
