import { mdiStorePlus, mdiUpdate } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import "../../../src/components/ha-fab";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-tabs-subpage";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { supervisorTabs } from "../hassio-tabs";
import "./hassio-addons";
import "../../../src/layouts/hass-subpage";
import { reloadHassioAddons } from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("hassio-dashboard")
class HassioDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

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
          .path=${mdiUpdate}
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
        hasFab
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
          right: calc(16px + env(safe-area-inset-right));
          bottom: calc(16px + env(safe-area-inset-bottom));
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
