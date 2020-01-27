import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  CSSResult,
  css,
  property,
} from "lit-element";
import { HomeAssistant } from "../../../../src/types";

@customElement("hc-launch-screen")
class HcLaunchScreen extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public error?: string;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <img
          src="https://www.home-assistant.io/images/blog/2018-09-thinking-big/social.png"
        />
        <div class="status">
          ${this.hass ? "Connected" : "Not Connected"}
          ${this.error
            ? html`
                <p>Error: ${this.error}</p>
              `
            : ""}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 100vh;
        padding-top: 64px;
        background-color: white;
        font-size: 24px;
      }
      .container {
        display: flex;
        flex-direction: column;
        text-align: center;
      }
      img {
        width: 717px;
        height: 376px;
        display: block;
        margin: 0 auto;
      }
      .status {
        padding-right: 54px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-launch-screen": HcLaunchScreen;
  }
}
