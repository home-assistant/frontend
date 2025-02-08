import { mdiRefresh, mdiStorePlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-fab";
import { reloadHassioAddons } from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import type { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-subpage";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import type { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import "./hassio-addons";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  firstUpdated() {
    if (!atLeastVersion(this.hass.config.version, 2022, 5)) {
      import("./hassio-update");
    }
  }

  protected render(): TemplateResult {
    if (atLeastVersion(this.hass.config.version, 2022, 5)) {
      return html`<hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        .header=${this.supervisor.localize("panel.addons")}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._handleCheckUpdates}
          .path=${mdiRefresh}
          .label=${this.supervisor.localize("store.check_updates")}
        ></ha-icon-button>
        <hassio-addons
          .hass=${this.hass}
          .supervisor=${this.supervisor}
          .narrow=${this.narrow}
        ></hassio-addons>
        <a href="/hassio/store">
          <ha-fab
            .label=${this.supervisor.localize("panel.store")}
            extended
            class="non-tabs"
          >
            <ha-svg-icon
              slot="icon"
              .path=${mdiStorePlus}
            ></ha-svg-icon></ha-fab
        ></a>
      </hass-subpage>`;
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${supervisorTabs(this.hass)}
        .mainPage=${!atLeastVersion(this.hass.config.version, 2021, 12)}
        back-path="/config"
        supervisor
        has-fab
      >
        <span slot="header">
          ${this.supervisor.localize(
            atLeastVersion(this.hass.config.version, 2021, 12)
              ? "panel.addons"
              : "panel.dashboard"
          )}
        </span>
        <div class="content">
          ${!atLeastVersion(this.hass.config.version, 2021, 12)
            ? html`
                <hassio-update
                  .hass=${this.hass}
                  .supervisor=${this.supervisor}
                ></hassio-update>
              `
            : ""}
          <hassio-addons
            .hass=${this.hass}
            .supervisor=${this.supervisor}
          ></hassio-addons>
        </div>

        <a href="/hassio/store" slot="fab">
          <ha-fab .label=${this.supervisor.localize("panel.store")} extended>
            <ha-svg-icon
              slot="icon"
              .path=${mdiStorePlus}
            ></ha-svg-icon> </ha-fab
        ></a>
      </hass-tabs-subpage>
    `;
  }

  private async _handleCheckUpdates() {
    try {
      await reloadHassioAddons(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    } finally {
      fireEvent(this, "supervisor-collection-refresh", { collection: "addon" });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          margin: 0 auto;
        }
        ha-fab.non-tabs {
          position: fixed;
          right: calc(16px + var(--safe-area-inset-right));
          bottom: calc(16px + var(--safe-area-inset-bottom));
          inset-inline-end: calc(16px + var(--safe-area-inset-right));
          inset-inline-start: initial;
          z-index: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-dashboard": HassioDashboard;
  }
}
