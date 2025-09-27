import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { BasePerson } from "../../data/person";
import { computeUserInitials } from "../../data/user";
import type { HomeAssistant } from "../../types";

@customElement("ha-person-badge")
class PersonBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public person?: BasePerson;

  protected render() {
    if (!this.person) {
      return nothing;
    }

    const picture = this.person.picture;

    if (picture) {
      return html`<div
        style=${styleMap({
          backgroundImage: `url(${this.hass.hassUrl(picture)})`,
        })}
        class="picture"
      ></div>`;
    }
    const initials = computeUserInitials(this.person.name);
    return html`<div
      class="initials ${classMap({ long: initials!.length > 2 })}"
    >
      ${initials}
    </div>`;
  }

  static styles = css`
    :host {
      width: 40px;
      height: 40px;
      display: block;
    }
    .picture {
      width: 100%;
      height: 100%;
      background-size: cover;
      border-radius: var(--ha-border-radius-circle);
    }
    .initials {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: var(--ha-border-radius-circle);
      background-color: var(--light-primary-color);
      text-decoration: none;
      color: var(--text-light-primary-color, var(--primary-text-color));
      overflow: hidden;
      font-size: var(--person-badge-font-size, var(--ha-font-size-m));
    }
    .initials.long {
      font-size: var(--ha-person-badge-font-size-long, var(--ha-font-size-s));
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-person-badge": PersonBadge;
  }
}
