import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../src/common/search/search-input";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-expansion-panel";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-markdown";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-svg-icon";
import "../../../src/components/ha-switch";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import "../../../src/layouts/hass-tabs-subpage";
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
