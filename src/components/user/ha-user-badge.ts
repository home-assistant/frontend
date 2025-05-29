import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import type { User } from "../../data/user";
import { computeUserInitials } from "../../data/user";
import type { CurrentUser, HomeAssistant } from "../../types";

@customElement("ha-user-badge")
class UserBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public user?: User | CurrentUser;

  @state() private _personPicture?: string;

  private _personEntityId?: string;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    if (changedProps.has("user")) {
      this._getPersonPicture();
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (
      this._personEntityId &&
      oldHass &&
      this.hass.states[this._personEntityId] !==
        oldHass.states[this._personEntityId]
    ) {
      const entityState = this.hass.states[this._personEntityId];
      if (entityState) {
        this._personPicture = entityState.attributes.entity_picture;
      } else {
        this._getPersonPicture();
      }
    } else if (!this._personEntityId && oldHass) {
      this._getPersonPicture();
    }
  }

  protected render() {
    if (!this.hass || !this.user) {
      return nothing;
    }
    const picture = this._personPicture;

    if (picture) {
      return html`<div
        style=${styleMap({
          backgroundImage: `url(${this.hass.hassUrl(picture)})`,
        })}
        class="picture"
      ></div>`;
    }
    const initials = computeUserInitials(this.user.name);
    return html`<div
      class="initials ${classMap({ long: initials!.length > 2 })}"
    >
      ${initials}
    </div>`;
  }

  private _getPersonPicture() {
    this._personEntityId = undefined;
    this._personPicture = undefined;
    if (!this.hass || !this.user) {
      return;
    }
    for (const entity of Object.values(this.hass.states)) {
      if (
        entity.attributes.user_id === this.user.id &&
        computeStateDomain(entity) === "person"
      ) {
        this._personEntityId = entity.entity_id;
        this._personPicture = entity.attributes.entity_picture;
        break;
      }
    }
  }

  static styles = css`
    :host {
      display: block;
      width: 40px;
      height: 40px;
    }
    .picture {
      width: 100%;
      height: 100%;
      background-size: cover;
      border-radius: 50%;
    }
    .initials {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--light-primary-color);
      text-decoration: none;
      color: var(--text-light-primary-color, var(--primary-text-color));
      overflow: hidden;
    }
    .initials.long {
      font-size: var(--ha-font-size-s);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-badge": UserBadge;
  }
}
