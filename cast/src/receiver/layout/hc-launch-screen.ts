import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../../../src/types";

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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100vh;
        background-color: white;
        font-size: 24px;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hc-launch-screen": HcLaunchScreen;
  }
}
