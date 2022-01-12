import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-subpage";
import { HomeAssistant, Route } from "../../../src/types";
import "./update-available-card";

@customElement("update-available-dashboard")
class UpdateAvailableDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  protected render(): TemplateResult {
    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
      >
        <update-available-card
          .hass=${this.hass}
          .supervisor=${this.supervisor}
          .route=${this.route}
          .narrow=${this.narrow}
          @update-complete=${this._updateComplete}
        ></update-available-card>
      </hass-subpage>
    `;
  }

  private _updateComplete() {
    history.back();
  }

  static get styles(): CSSResultGroup {
    return css`
      hass-subpage {
        --app-header-background-color: var(--primary-background-color);
        --app-header-text-color: var(--sidebar-text-color);
      }
      update-available-card {
        margin: auto;
        margin-top: 16px;
        margin-bottom: 24px;
        max-width: 600px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "update-available-dashboard": UpdateAvailableDashboard;
  }
}
