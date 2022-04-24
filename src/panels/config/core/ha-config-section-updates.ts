import { HassEntities } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-alert";
import "../../../components/ha-bar";
import "../../../components/ha-metric";
import { updateCanInstall, UpdateEntity } from "../../../data/update";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import "../dashboard/ha-config-updates";
import "./ha-config-analytics";

@customElement("ha-config-section-updates")
class HaConfigSectionUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  private _notifyUpdates = false;

  protected render(): TemplateResult {
    const canInstallUpdates = this._filterUpdateEntitiesWithInstall(
      this.hass.states
    );

    return html`
      <hass-subpage
        back-path="/config/system"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.updates.caption")}
      >
        <div class="content">
          <ha-card outlined>
            ${canInstallUpdates.length
              ? html`
                  <ha-config-updates
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .updateEntities=${canInstallUpdates}
                    showAll
                  ></ha-config-updates>
                `
              : html`
                  ${this.hass.localize("ui.panel.config.updates.no_updates")}
                `}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!changedProps.has("hass") || !this._notifyUpdates) {
      return;
    }
    this._notifyUpdates = false;
    if (this._filterUpdateEntitiesWithInstall(this.hass.states).length) {
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.updates.updates_refreshed"
        ),
      });
    } else {
      showToast(this, {
        message: this.hass.localize("ui.panel.config.updates.no_new_updates"),
      });
    }
  }

  private _filterUpdateEntities = memoizeOne((entities: HassEntities) =>
    (
      Object.values(entities).filter(
        (entity) => computeStateDomain(entity) === "update"
      ) as UpdateEntity[]
    ).sort((a, b) => {
      if (a.attributes.title === "Home Assistant Core") {
        return -3;
      }
      if (b.attributes.title === "Home Assistant Core") {
        return 3;
      }
      if (a.attributes.title === "Home Assistant Operating System") {
        return -2;
      }
      if (b.attributes.title === "Home Assistant Operating System") {
        return 2;
      }
      if (a.attributes.title === "Home Assistant Supervisor") {
        return -1;
      }
      if (b.attributes.title === "Home Assistant Supervisor") {
        return 1;
      }
      return caseInsensitiveStringCompare(
        a.attributes.title || a.attributes.friendly_name || "",
        b.attributes.title || b.attributes.friendly_name || ""
      );
    })
  );

  private _filterUpdateEntitiesWithInstall = memoizeOne(
    (entities: HassEntities) =>
      this._filterUpdateEntities(entities).filter((entity) =>
        updateCanInstall(entity)
      )
  );

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ha-card {
      padding: 16px;
      max-width: 500px;
      margin: 0 auto;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-updates": HaConfigSectionUpdates;
  }
}
