import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-relative-time";
import { HomeAssistant } from "../../../types";

@customElement("more-info-script")
class MoreInfoScript extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj?: HassEntity;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }

    return html`
      <hr />
      <div class="flex">
        <div>
          ${this.hass.localize(
            "ui.dialogs.more_info_control.script.last_triggered"
          )}:
        </div>
        ${this.stateObj.attributes.last_triggered
          ? html`
              <ha-relative-time
                .hass=${this.hass}
                .datetime=${this.stateObj.attributes.last_triggered}
                capitalize
              ></ha-relative-time>
            `
          : this.hass.localize("ui.components.relative_time.never")}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
      }
      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-script": MoreInfoScript;
  }
}
