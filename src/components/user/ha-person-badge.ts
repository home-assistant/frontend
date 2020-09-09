import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import { Person } from "../../data/person";
import { computeInitials } from "./ha-user-badge";

@customElement("ha-person-badge")
class PersonBadge extends LitElement {
  @property({ attribute: false }) public person?: Person;

  protected render(): TemplateResult {
    if (!this.person) {
      return html``;
    }

    const picture = this.person.picture;

    if (picture) {
      return html`<div
        style=${styleMap({ backgroundImage: `url(${picture})` })}
        class="picture"
      ></div>`;
    }
    const initials = computeInitials(this.person.name);
    return html`<div
      class="initials ${classMap({ long: initials!.length > 2 })}"
    >
      ${initials}
    </div>`;
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
    "ha-person-badge": PersonBadge;
  }
}
