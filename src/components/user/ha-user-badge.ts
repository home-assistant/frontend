import {
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  html,
  property,
  customElement,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { User } from "../../data/auth";
import { CurrentUser } from "../../types";

const computeInitials = (name: string) => {
  if (!name) {
    return "user";
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
class StateBadge extends LitElement {
  @property() public user?: User | CurrentUser;

  protected render(): TemplateResult | void {
    const user = this.user;

    const initials = user ? computeInitials(user.name) : "?";

    return html`
      <div
        class="${classMap({
          "profile-badge": true,
          long: initials.length > 2,
        })}"
      >
        ${initials}
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .profile-badge {
        /* for ripple */
        position: relative;
        display: inline-block;
        box-sizing: border-box;
        width: 40px;
        line-height: 40px;
        border-radius: 50%;
        text-align: center;
        background-color: var(--light-primary-color);
        text-decoration: none;
        color: var(--primary-text-color);
        overflow: hidden;
      }

      .profile-badge.long {
        font-size: 80%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-badge": StateBadge;
  }
}
