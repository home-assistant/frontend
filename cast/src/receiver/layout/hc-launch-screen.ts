import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../../../src/types";

@customElement("hc-launch-screen")
class HcLaunchScreen extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public error?: string;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <img
          alt="Nabu Casa logo on left, Home Assistant logo on right, and red heart in center"
          src="https://cast.home-assistant.io/images/nabu-loves-hass.png"
        />
        <div class="status">
          ${this.hass ? "Connected" : "Not Connected"}
          ${this.error ? html` <p>Error: ${this.error}</p> ` : ""}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background-color: #f2f4f9;
      font-size: var(--ha-font-size-2xl);
    }
    .container {
      display: flex;
      flex-direction: column;
      text-align: center;
      align-items: center;
      height: 100%;
      justify-content: space-evenly;
    }
    img {
      max-width: 80%;
      object-fit: cover;
    }
    .status {
      color: #1d2126;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-launch-screen": HcLaunchScreen;
  }
}
