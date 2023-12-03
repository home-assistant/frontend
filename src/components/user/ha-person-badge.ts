import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { BasePerson } from "../../data/person";
import { computeUserInitials } from "../../data/user";

@customElement("ha-person-badge")
class PersonBadge extends LitElement {
  @property({ attribute: false }) public person?: BasePerson;

  protected render() {
    if (!this.person) {
      return nothing;
    }

    const picture = this.person.picture;

    if (picture) {
      return html`<div
        style=${styleMap({ backgroundImage: `url(${picture})` })}
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        width: 40px;
        height: 40px;
        display: block;
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
        font-size: var(--person-badge-font-size, 1em);
      }
      .initials.long {
        font-size: 80%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-person-badge": PersonBadge;
  }
}
