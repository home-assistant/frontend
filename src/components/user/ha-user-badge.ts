import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { User } from "../../data/user";
import { CurrentUser, HomeAssistant } from "../../types";

export const computeInitials = (name: string) => {
  if (!name) {
    return "?";
  }
  return (
    name
      .trim()
      // Split by space and take first 3 words
      .split(" ")
      .slice(0, 3)
      // Of each word, take first letter
      .map((s) => s.substr(0, 1))
      .join("")
  );
};

@customElement("ha-user-badge")
class UserBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public user?: User | CurrentUser;

  @internalProperty() private _personPicture?: string;

  private _personEntityId?: string;

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("user")) {
      this._getPersonPicture();
      return;
    }
    const oldHass = changedProps.get("hass");
    if (
      this._personEntityId &&
      oldHass &&
      this.hass.states[this._personEntityId] !==
        oldHass.states[this._personEntityId]
    ) {
      const state = this.hass.states[this._personEntityId];
      if (state) {
        this._personPicture = state.attributes.entity_picture;
      } else {
        this._getPersonPicture();
      }
    } else if (!this._personEntityId && oldHass) {
      this._getPersonPicture();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.user) {
      return html``;
    }
    const picture = this._personPicture;

    if (picture) {
      return html`<div
        style=${styleMap({ backgroundImage: `url(${picture})` })}
        class="picture"
      ></div>`;
    }
    const initials = computeInitials(this.user.name);
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

  static get styles(): CSSResult {
    return css`
      :host {
        display: contents;
      }
      .picture {
        width: 40px;
        height: 40px;
        background-size: cover;
        border-radius: 50%;
      }
      .initials {
        display: inline-block;
        box-sizing: border-box;
        width: 40px;
        line-height: 40px;
        border-radius: 50%;
        text-align: center;
        background-color: var(--light-primary-color);
        text-decoration: none;
        color: var(--text-light-primary-color, var(--primary-text-color));
        overflow: hidden;
      }
      .initials.long {
        font-size: 80%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-badge": UserBadge;
  }
}
