import {
  html,
  LitElement,
  TemplateResult,
  css,
  CSSResult,
  property,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import { fireEvent } from "../../../../common/dom/fire_event";

declare global {
  // tslint:disable-next-line
  interface HASSDomEvents {
    "opened-changed": { value: boolean };
  }
}

class HuiNotificationsButton extends LitElement {
  @property() public notifications?: string[];
  @property() public opened?: boolean;

  protected render(): TemplateResult | void {
    return html`
      <paper-icon-button
        icon="hass:bell"
        @click="${this._clicked}"
      ></paper-icon-button>
      ${this.notifications && this.notifications.length > 0
        ? html`
            <span class="indicator">
              <div>${this.notifications.length}</div>
            </span>
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

        .indicator {
          position: absolute;
          top: 0px;
          right: -3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-color);
          pointer-events: none;
          z-index: 1;
        }

        .indicator > div {
          right: 7px;
          top: 3px;
          position: absolute;
          font-size: 0.55em;
        }
      `,
    ];
  }

  private _clicked() {
    this.opened = true;
    fireEvent(this, "opened-changed", { value: this.opened });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-notifications-button": HuiNotificationsButton;
  }
}

customElements.define("hui-notifications-button", HuiNotificationsButton);
