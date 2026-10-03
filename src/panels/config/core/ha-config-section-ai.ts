import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../layouts/hass-subpage";
import "./ai-task-pref";
import "./mcp-pref";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-section-ai")
class HaConfigSectionAI extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.ai.caption")}
      >
        <div class="content">
          <ai-task-pref
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ai-task-pref>
          <mcp-pref .hass=${this.hass} .narrow=${this.narrow}></mcp-pref>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: var(--ha-space-7) var(--ha-space-5) 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ai-task-pref,
    mcp-pref {
      max-width: 600px;
      margin: 0 auto;
      display: block;
    }
    mcp-pref {
      margin-top: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-ai": HaConfigSectionAI;
  }
}
