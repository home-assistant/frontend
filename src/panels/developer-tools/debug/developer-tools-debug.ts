import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./ha-debug-connection-row";

@customElement("developer-tools-debug")
class HaPanelDevDebug extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  protected render() {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass.localize(
            "ui.panel.developer-tools.tabs.debug.title"
          )}
          class="form"
        >
          <div class="card-content">
                  <ha-debug-connection-row
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                  ></ha-debug-connection-row>
        </ha-card>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 16px;
          display: block;
          max-width: 600px;
          margin: 0 auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "developer-tools-debug": HaPanelDevDebug;
  }
}
