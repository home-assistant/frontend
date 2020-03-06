import {
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  html,
  property,
  customElement,
} from "lit-element";
import { User } from "../../data/user";
import { CurrentUser } from "../../types";
import { toggleAttribute } from "../../common/dom/toggle_attribute";

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

  protected render(): TemplateResult {
    const user = this.user;
    const initials = user ? computeInitials(user.name) : "?";
    return html`
      ${initials}
    `;
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "long",
      (this.user ? computeInitials(this.user.name) : "?").length > 2
    );
  }

  static get styles(): CSSResult {
    return css`
      :host {
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

      :host([long]) {
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
