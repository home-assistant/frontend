import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { Person } from "../../data/person";
import { computeUserInitials } from "../../data/user";

@customElement("ha-person-badge")
class PersonBadge extends LitElement {
  @property({ attribute: false }) public person?: Person;

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
    "ha-person-badge": PersonBadge;
  }
}
