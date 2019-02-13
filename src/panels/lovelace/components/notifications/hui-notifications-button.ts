import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-badge/paper-badge";
import "@polymer/paper-icon-button/paper-icon-button";
import { fireEvent } from "../../../../common/dom/fire_event";

class HuiNotificationsButton extends LitElement {
  @property() public notifications?: string[];
  @property() public opened?: boolean;

  protected render(): TemplateResult | void {
    return html`
      <paper-icon-button
        icon="hass:bell"
        @click="${this._clicked}"
      ></paper-icon-button>
      ${this.notifications
        ? html`
            <paper-badge .label="${this.notifications.length}"></paper-badge>
          `
        : ""}
    `;
  }

  static get styles(): CSSResult[] {
    return [
      css`
        :host {
          position: relative;
        }
        paper-badge {
          left: 23px !important;
          top: 0px !important;
        }
      `,
    ];
  }

  private _clicked() {
    this.opened = true;
    fireEvent(this, "opened", { value: this.opened });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-notifications-button": HuiNotificationsButton;
  }
}

customElements.define("hui-notifications-button", HuiNotificationsButton);
