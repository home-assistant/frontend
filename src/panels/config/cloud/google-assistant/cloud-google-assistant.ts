import {
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  customElement,
  property,
} from "lit-element";
import memoizeOne from "memoize-one";
import "@polymer/paper-icon-button";

import "../../../../layouts/hass-subpage";
import "../../../../layouts/hass-loading-screen";
import "../../../../components/ha-card";
import "../../../../components/entity/state-info";
import "../../../../components/ha-switch";

import { HomeAssistant } from "../../../../types";
import {
  CloudStatusLoggedIn,
  CloudPreferences,
  updateCloudGoogleEntityConfig,
  cloudSyncGoogleAssistant,
  GoogleEntityConfig,
} from "../../../../data/cloud";
import {
  generateFilter,
  isEmptyFilter,
  EntityFilter,
} from "../../../../common/entity/entity_filter";
import { compare } from "../../../../common/string/compare";
import { fireEvent } from "../../../../common/dom/fire_event";
import { showToast } from "../../../../util/toast";
import { showDomainTogglerDialog } from "../../../../dialogs/domain-toggler/show-dialog-domain-toggler";
import {
  GoogleEntity,
  fetchCloudGoogleEntities,
} from "../../../../data/google_assistant";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../../../components/ha-switch";

import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeDomain } from "../../../../common/entity/compute_domain";

const DEFAULT_CONFIG_EXPOSE = true;

const configIsExposed = (config: GoogleEntityConfig) =>
  config.should_expose === undefined
    ? DEFAULT_CONFIG_EXPOSE
    : config.should_expose;

@customElement("cloud-google-assistant")
class CloudGoogleAssistant extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public cloudStatus!: CloudStatusLoggedIn;
  @property() public narrow!: boolean;
  @property() private _entities?: GoogleEntity[];
  @property()
  private _entityConfigs: CloudPreferences["google_entity_configs"] = {};
  private _popstateSyncAttached = false;
  private _popstateReloadStatusAttached = false;
  private _isInitialExposed?: Set<string>;

  private _getEntityFilterFunc = memoizeOne((filter: EntityFilter) =>
    generateFilter(
      filter.include_domains,
      filter.include_entities,
      filter.exclude_domains,
      filter.exclude_entities
    )
  );

  protected render(): TemplateResult {
    if (this._entities === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }
    const emptyFilter = isEmptyFilter(this.cloudStatus.google_entities);
    const filterFunc = this._getEntityFilterFunc(
      this.cloudStatus.google_entities
    );

    // We will only generate `isInitialExposed` during first render.
    // On each subsequent render we will use the same set so that cards
    // will not jump around when we change the exposed setting.
    const showInExposed = this._isInitialExposed || new Set();
    const trackExposed = this._isInitialExposed === undefined;

    let selected = 0;

    // On first render we decide which cards show in which category.
    // That way cards won't jump around when changing values.
    const exposedCards: TemplateResult[] = [];
    const notExposedCards: TemplateResult[] = [];

    this._entities.forEach((entity) => {
      const stateObj = this.hass.states[entity.entity_id];
      const config = this._entityConfigs[entity.entity_id] || {};
      const isExposed = emptyFilter
        ? configIsExposed(config)
        : filterFunc(entity.entity_id);
      if (isExposed) {
        selected++;

        if (trackExposed) {
          showInExposed.add(entity.entity_id);
        }
      }

      const target = showInExposed.has(entity.entity_id)
        ? exposedCards
        : notExposedCards;

      target.push(html`
        <ha-card>
          <div class="card-content">
            <state-info
              .hass=${this.hass}
              .stateObj=${stateObj}
              secondary-line
              @click=${this._showMoreInfo}
            >
              ${entity.traits
                .map((trait) => trait.substr(trait.lastIndexOf(".") + 1))
                .join(", ")}
            </state-info>
            <ha-switch
              .entityId=${entity.entity_id}
              .disabled=${!emptyFilter}
              .checked=${isExposed}
              @change=${this._exposeChanged}
            >
              ${this.hass!.localize("ui.panel.config.cloud.google.expose")}
            </ha-switch>
            ${entity.might_2fa
              ? html`
                  <ha-switch
                    .entityId=${entity.entity_id}
                    .checked=${Boolean(config.disable_2fa)}
                    @change=${this._disable2FAChanged}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.google.disable_2FA"
                    )}
                  </ha-switch>
                `
              : ""}
          </div>
        </ha-card>
      `);
    });

    if (trackExposed) {
      this._isInitialExposed = showInExposed;
    }

    return html`
      <hass-subpage header="${this.hass!.localize(
        "ui.panel.config.cloud.google.title"
      )}">
        <span slot="toolbar-icon">
          ${selected}${
      !this.narrow
        ? html`
            selected
          `
        : ""
    }
        </span>
        ${
          emptyFilter
            ? html`
                <paper-icon-button
                  slot="toolbar-icon"
                  icon="hass:tune"
                  @click=${this._openDomainToggler}
                ></paper-icon-button>
              `
            : ""
        }
        ${
          !emptyFilter
            ? html`
                <div class="banner">
                  ${this.hass!.localize("ui.panel.config.cloud.google.banner")}
                </div>
              `
            : ""
        }
          ${
            exposedCards.length > 0
              ? html`
                  <h1>
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.google.exposed_entities"
                    )}
                  </h1>
                  <div class="content">${exposedCards}</div>
                `
              : ""
          }
          ${
            notExposedCards.length > 0
              ? html`
                  <h1>
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.google.not_exposed_entities"
                    )}
                  </h1>
                  <div class="content">${notExposedCards}</div>
                `
              : ""
          }
        </div>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("cloudStatus")) {
      this._entityConfigs = this.cloudStatus.prefs.google_entity_configs;
    }
  }

  private async _fetchData() {
    const entities = await fetchCloudGoogleEntities(this.hass);
    entities.sort((a, b) => {
      const stateA = this.hass.states[a.entity_id];
      const stateB = this.hass.states[b.entity_id];
      return compare(
        stateA ? computeStateName(stateA) : a.entity_id,
        stateB ? computeStateName(stateB) : b.entity_id
      );
    });
    this._entities = entities;
  }

  private _showMoreInfo(ev) {
    const entityId = ev.currentTarget.stateObj.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private async _exposeChanged(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    const newExposed = (ev.target as HaSwitch).checked;
    await this._updateExposed(entityId, newExposed);
  }

  private async _updateExposed(entityId: string, newExposed: boolean) {
    const curExposed = configIsExposed(this._entityConfigs[entityId] || {});
    if (newExposed === curExposed) {
      return;
    }
    await this._updateConfig(entityId, {
      should_expose: newExposed,
    });
    this._ensureEntitySync();
  }

  private async _disable2FAChanged(ev: Event) {
    const entityId = (ev.currentTarget as any).entityId;
    const newDisable2FA = (ev.target as HaSwitch).checked;
    const curDisable2FA = Boolean(
      (this._entityConfigs[entityId] || {}).disable_2fa
    );
    if (newDisable2FA === curDisable2FA) {
      return;
    }
    await this._updateConfig(entityId, {
      disable_2fa: newDisable2FA,
    });
  }

  private async _updateConfig(entityId: string, values: GoogleEntityConfig) {
    const updatedConfig = await updateCloudGoogleEntityConfig(
      this.hass,
      entityId,
      values
    );
    this._entityConfigs = {
      ...this._entityConfigs,
      [entityId]: updatedConfig,
    };
    this._ensureStatusReload();
  }

  private _openDomainToggler() {
    showDomainTogglerDialog(this, {
      domains: this._entities!.map((entity) =>
        computeDomain(entity.entity_id)
      ).filter((value, idx, self) => self.indexOf(value) === idx),
      toggleDomain: (domain, turnOn) => {
        this._entities!.forEach((entity) => {
          if (computeDomain(entity.entity_id) === domain) {
            this._updateExposed(entity.entity_id, turnOn);
          }
        });
      },
    });
  }

  private _ensureStatusReload() {
    if (this._popstateReloadStatusAttached) {
      return;
    }
    this._popstateReloadStatusAttached = true;
    // Cache parent because by the time popstate happens,
    // this element is detached
    const parent = this.parentElement!;
    window.addEventListener(
      "popstate",
      () => fireEvent(parent, "ha-refresh-cloud-status"),
      { once: true }
    );
  }

  private _ensureEntitySync() {
    if (this._popstateSyncAttached) {
      return;
    }
    this._popstateSyncAttached = true;
    // Cache parent because by the time popstate happens,
    // this element is detached
    const parent = this.parentElement!;
    window.addEventListener(
      "popstate",
      () => {
        showToast(parent, {
          message: this.hass!.localize(
            "ui.panel.config.cloud.google.sync_to_google"
          ),
        });
        cloudSyncGoogleAssistant(this.hass);
      },
      { once: true }
    );
  }

  static get styles(): CSSResult {
    return css`
      .banner {
        color: var(--primary-text-color);
        background-color: var(
          --ha-card-background,
          var(--paper-card-background-color, white)
        );
        padding: 16px 8px;
        text-align: center;
      }
      h1 {
        color: var(--primary-text-color);
        font-size: 24px;
        letter-spacing: -0.012em;
        margin-bottom: 0;
        padding: 0 8px;
      }
      .content {
        display: flex;
        flex-wrap: wrap;
        padding: 4px;
      }
      ha-card {
        margin: 4px;
        flex-basis: 300px;
        flex-grow: 1;
      }
      .card-content {
        padding-bottom: 12px;
      }
      state-info {
        cursor: pointer;
      }
      ha-switch {
        padding: 8px 0;
      }

      @media all and (max-width: 450px) {
        ha-card {
          max-width: 100%;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-google-assistant": CloudGoogleAssistant;
  }
}
