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
import "./hassio-supervisor-update";
import "./hassio-hassos-update";
import "./hassio-hass-update";
import { HomeAssistant } from "../../../src/types";
import {
  HassioSupervisorInfo,
  HassioHomeAssistantInfo,
  HassioHassOSInfo,
} from "../../../src/data/hassio";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hassInfo!: HassioHomeAssistantInfo;
  @property() public hassOsInfo!: HassioHassOSInfo;

  protected render(): TemplateResult | void {
    return html`
      <div class="content">
        <hassio-hass-update
          .hass=${this.hass}
          .hassInfo=${this.hassInfo}
        ></hassio-hass-update>
        <hassio-supervisor-update
          .hass=${this.hass}
          .supervisorInfo=${this.supervisorInfo}
        ></hassio-supervisor-update>
        <hassio-hassos-update
          .hass=${this.hass}
          .hassOsInfo=${this.hassOsInfo}
        ></hassio-hassos-update>
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
