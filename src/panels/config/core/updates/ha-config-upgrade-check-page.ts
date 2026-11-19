import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../../types";
import "./ha-config-upgrade-check";

@customElement("ha-config-upgrade-check-page")
class HaConfigUpgradeCheckPage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render() {
    return html`
      <hass-subpage
        back-path="/config/updates"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize(
          "ui.panel.config.updates.upgrade_check.core"
        )}
      >
        <div class="content">
          <ha-config-upgrade-check .hass=${this.hass}></ha-config-upgrade-check>
        </div>
      </hass-subpage>
    `;
  }

  static styles = css`
    .content {
      padding: 28px var(--ha-content-gutter) 0;
      max-width: var(--ha-content-width-narrow);
      margin: 0 auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-upgrade-check-page": HaConfigUpgradeCheckPage;
  }
}
