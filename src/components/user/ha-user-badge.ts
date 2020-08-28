import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  internalProperty,
} from "lit-element";
import { toggleAttribute } from "../../common/dom/toggle_attribute";
import { styleMap } from "lit-html/directives/style-map";

import { HomeAssistant, CurrentUser } from "../../types";
import { fetchPersons, Person } from "../../data/person";
import { User } from "../../data/user";

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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public user?: User | CurrentUser | Person;

  @internalProperty() private _persons?: Person[];

  protected render(): TemplateResult {
    if (!this.hass || !this._persons) {
      return html``;
    }
    const user = this.user || this.hass.user;
    const person = this._persons.find((p) => p.user_id || p.id === user?.id);

    return html`
      ${person
        ? person.picture
          ? html`<div
              style=${styleMap({ backgroundImage: `url(${person.picture})` })}
              class="picture"
            ></div>`
          : html`<div
              class="initials"
              ?long=${(user ? computeInitials(user.name) : "?").length > 2}
            >
              ${computeInitials(user?.name!)}
            </div>`
        : html`<div class="initials">?</div>`}
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  private async _fetchData() {
    const personData = await fetchPersons(this.hass!);

    this._persons = personData.config.concat(personData.storage);
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    toggleAttribute(
      this,
      "long",
      (this.hass?.user ? computeInitials(this.hass.user.name) : "?").length > 2
    );
  }

  static get styles(): CSSResult {
    return css`
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
      .initials[long] {
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
