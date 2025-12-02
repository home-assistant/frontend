import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-spinner";
import type { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import { haStyle } from "../../../../src/resources/styles";
import type { HomeAssistant, Route } from "../../../../src/types";
import { hassioStyle } from "../../resources/hassio-style";
import "./hassio-addon-info";

@customElement("hassio-addon-info-tab")
class HassioAddonInfoDashboard extends LitElement {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public addon?: HassioAddonDetails;

  @property({ type: Boolean, attribute: "control-enabled" })
  public controlEnabled = false;

  protected render(): TemplateResult {
    if (!this.addon) {
      return html`<ha-spinner></ha-spinner>`;
    }

    return html`
      <div class="content">
        <hassio-addon-info
          .narrow=${this.narrow}
          .route=${this.route}
          .hass=${this.hass}
          .supervisor=${this.supervisor}
          .addon=${this.addon}
          .controlEnabled=${this.controlEnabled}
        ></hassio-addon-info>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        .content {
          margin: auto;
          padding: 8px;
          max-width: 1024px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-info-tab": HassioAddonInfoDashboard;
  }
}
