import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  customElement,
} from "lit-element";
import "./hassio-addons";
import "./hassio-hass-update";
import { HomeAssistant } from "../../../src/types";
import {
  HassioSupervisorInfo,
  HassioHomeAssistantInfo,
} from "../../../src/data/hassio";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hassInfo!: HassioHomeAssistantInfo;

  protected render(): TemplateResult | void {
    return html`
      <div class="content">
        <hassio-hass-update
          .hass=${this.hass}
          .hassInfo=${this.hassInfo}
        ></hassio-hass-update>
        <hassio-addons
          .hass=${this.hass}
          .addons=${this.supervisorInfo.addons}
        ></hassio-addons>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      .content {
        margin: 0 auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-dashboard": HassioDashboard;
  }
}
