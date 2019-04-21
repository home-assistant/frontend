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
import "../components/hassio-search-input";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfo;
  @property() public hassInfo!: HassioHomeAssistantInfo;
  @property() private _filter?: string;

  protected render(): TemplateResult | void {
    return html`
      <div class="content">
        <hassio-hass-update
          .hass=${this.hass}
          .hassInfo=${this.hassInfo}
        ></hassio-hass-update>

        <hassio-search-input
          .filter=${this._filter}
          @filter-changed=${this._filterChanged}
        ></hassio-search-input>

        <hassio-addons
          .hass=${this.hass}
          .addons=${this.supervisorInfo.addons}
          .filter=${this._filter}
        ></hassio-addons>
      </div>
    `;
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
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
