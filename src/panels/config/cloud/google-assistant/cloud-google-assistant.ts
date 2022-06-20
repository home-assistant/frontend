import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheckboxMarked,
  mdiCheckboxMultipleMarked,
  mdiCloseBox,
  mdiCloseBoxMultiple,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  EntityFilter,
  generateFilter,
  isEmptyFilter,
} from "../../../../common/entity/entity_filter";
import { stringCompare } from "../../../../common/string/compare";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/entity/state-info";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-card";
import "../../../../components/ha-formfield";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import {
  CloudPreferences,
  CloudStatusLoggedIn,
  cloudSyncGoogleAssistant,
  GoogleEntityConfig,
  updateCloudGoogleEntityConfig,
  updateCloudPref,
} from "../../../../data/cloud";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../../data/entity_registry";
import {
  fetchCloudGoogleEntities,
  GoogleEntity,
} from "../../../../data/google_assistant";
import { showDomainTogglerDialog } from "../../../../dialogs/domain-toggler/show-dialog-domain-toggler";
import "../../../../layouts/hass-loading-screen";
import "../../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";

const DEFAULT_CONFIG_EXPOSE = true;

@customElement("cloud-google-assistant")
class CloudGoogleAssistant extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public cloudStatus!: CloudStatusLoggedIn;

  @property() public narrow!: boolean;

  @state() private _entities?: GoogleEntity[];

  @state()
  private _entityConfigs: CloudPreferences["google_entity_configs"] = {};

  @state()
  private _entityCategories?: Record<
    string,
    EntityRegistryEntry["entity_category"]
  >;

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
    if (this._entities === undefined || this._entityCategories === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }
    const emptyFilter = isEmptyFilter(this.cloudStatus.google_entities);
    const filterFunc = this._getEntityFilterFunc(
      this.cloudStatus.google_entities
    );
    const dir = computeRTLDirection(this.hass!);

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
      const config = this._entityConfigs[entity.entity_id] || {
        should_expose: null,
      };
      const isExposed = emptyFilter
        ? this._configIsExposed(
            entity.entity_id,
            config,
            this._entityCategories![entity.entity_id]
          )
        : filterFunc(entity.entity_id);
      const isDomainExposed = emptyFilter
        ? this._configIsDomainExposed(
            entity.entity_id,
            this._entityCategories![entity.entity_id]
          )
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

      const iconButton = html`<ha-icon-button
        slot="trigger"
        class=${classMap({
          exposed: isExposed!,
          "not-exposed": !isExposed,
        })}
        .disabled=${!emptyFilter}
        .label=${this.hass!.localize("ui.panel.config.cloud.google.expose")}
        .path=${config.should_expose !== null
          ? isExposed
            ? mdiCheckboxMarked
            : mdiCloseBox
          : isDomainExposed
          ? mdiCheckboxMultipleMarked
          : mdiCloseBoxMultiple}
      ></ha-icon-button>`;

      target.push(html`
        <ha-card outlined>
          <div class="card-content">
            <div class="top-line">
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
              ${!emptyFilter
                ? html`${iconButton}`
                : html`<ha-button-menu
                    corner="BOTTOM_START"
                    .entityId=${stateObj.entity_id}
                    @action=${this._exposeChanged}
                  >
                    ${iconButton}
                    <mwc-list-item hasMeta>
                      ${this.hass!.localize(
                        "ui.panel.config.cloud.google.expose_entity"
                      )}
                      <ha-svg-icon
                        class="exposed"
                        slot="meta"
                        .path=${mdiCheckboxMarked}
                      ></ha-svg-icon>
                    </mwc-list-item>
                    <mwc-list-item hasMeta>
                      ${this.hass!.localize(
                        "ui.panel.config.cloud.google.dont_expose_entity"
                      )}
                      <ha-svg-icon
                        class="not-exposed"
                        slot="meta"
                        .path=${mdiCloseBox}
                      ></ha-svg-icon>
                    </mwc-list-item>
                    <mwc-list-item hasMeta>
                      ${this.hass!.localize(
                        "ui.panel.config.cloud.google.follow_domain"
                      )}
                      <ha-svg-icon
                        class=${classMap({
                          exposed: isDomainExposed,
                          "not-exposed": !isDomainExposed,
                        })}
                        slot="meta"
                        .path=${isDomainExposed
                          ? mdiCheckboxMultipleMarked
                          : mdiCloseBoxMultiple}
                      ></ha-svg-icon>
                    </mwc-list-item>
                  </ha-button-menu>`}
            </div>
            ${entity.might_2fa
              ? html`
                  <div>
                    <ha-formfield
                      .label=${this.hass!.localize(
                        "ui.panel.config.cloud.google.disable_2FA"
                      )}
                      .dir=${dir}
                    >
                      <ha-switch
                        .entityId=${entity.entity_id}
                        .checked=${Boolean(config.disable_2fa)}
                        @change=${this._disable2FAChanged}
                      ></ha-switch>
                    </ha-formfield>
                  </div>
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
      <hass-subpage
        .hass=${this.hass}
        .header=${this.hass!.localize("ui.panel.config.cloud.google.title")}
        .narrow=${this.narrow}>
        ${
          emptyFilter
            ? html`
                <mwc-button
                  slot="toolbar-icon"
                  @click=${this._openDomainToggler}
                  >${this.hass!.localize(
                    "ui.panel.config.cloud.google.manage_defaults"
                  )}</mwc-button
                >
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
                  <div class="header">
                    <h3>
                      ${this.hass!.localize(
                        "ui.panel.config.cloud.google.exposed_entities"
                      )}
                    </h3>
                    ${!this.narrow
                      ? this.hass!.localize(
                          "ui.panel.config.cloud.alexa.exposed",
                          "selected",
                          selected
                        )
                      : selected}
                  </div>
                  <div class="content">${exposedCards}</div>
                `
              : ""
          }
          ${
            notExposedCards.length > 0
              ? html`
                  <div class="header second">
                    <h3>
                      ${this.hass!.localize(
                        "ui.panel.config.cloud.google.not_exposed_entities"
                      )}
                    </h3>
                    ${!this.narrow
                      ? this.hass!.localize(
                          "ui.panel.config.cloud.alexa.not_exposed",
                          "selected",
                          this._entities.length - selected
                        )
                      : this._entities.length - selected}
                  </div>
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

  protected override hassSubscribe(): (
    | UnsubscribeFunc
    | Promise<UnsubscribeFunc>
  )[] {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        const categories = {};

        for (const entry of entries) {
          categories[entry.entity_id] = entry.entity_category;
        }

        this._entityCategories = categories;
      }),
    ];
  }

  private _configIsDomainExposed(
    entityId: string,
    entityCategory: EntityRegistryEntry["entity_category"] | undefined
  ) {
    const domain = computeDomain(entityId);
    return this.cloudStatus.prefs.google_default_expose
      ? !entityCategory &&
          this.cloudStatus.prefs.google_default_expose.includes(domain)
      : DEFAULT_CONFIG_EXPOSE;
  }

  private _configIsExposed(
    entityId: string,
    config: GoogleEntityConfig,
    entityCategory: EntityRegistryEntry["entity_category"] | undefined
  ) {
    return (
      config.should_expose ??
      this._configIsDomainExposed(entityId, entityCategory)
    );
  }

  private async _fetchData() {
    const entities = await fetchCloudGoogleEntities(this.hass);
    entities.sort((a, b) => {
      const stateA = this.hass.states[a.entity_id];
      const stateB = this.hass.states[b.entity_id];
      return stringCompare(
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

  private async _exposeChanged(ev: CustomEvent<ActionDetail>) {
    const entityId = (ev.currentTarget as any).entityId;
    let newVal: boolean | null = null;
    switch (ev.detail.index) {
      case 0:
        newVal = true;
        break;
      case 1:
        newVal = false;
        break;
      case 2:
        newVal = null;
        break;
    }
    await this._updateExposed(entityId, newVal);
  }

  private async _updateExposed(entityId: string, newExposed: boolean | null) {
    await this._updateConfig(entityId, {
      should_expose: newExposed,
    });
    if (this.cloudStatus.google_registered) {
      this._ensureEntitySync();
    }
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
      title: this.hass!.localize(
        "ui.panel.config.cloud.google.manage_defaults"
      ),
      description: this.hass!.localize(
        "ui.panel.config.cloud.google.manage_defaults_dialog_description"
      ),
      domains: this._entities!.map((entity) =>
        computeDomain(entity.entity_id)
      ).filter((value, idx, self) => self.indexOf(value) === idx),
      exposedDomains: this.cloudStatus.prefs.google_default_expose,
      toggleDomain: (domain, expose) => {
        this._updateDomainExposed(domain, expose);
      },
      resetDomain: (domain) => {
        this._entities!.forEach((entity) => {
          if (computeDomain(entity.entity_id) === domain) {
            this._updateExposed(entity.entity_id, null);
          }
        });
      },
    });
  }

  private async _updateDomainExposed(domain: string, expose: boolean) {
    const defaultExpose =
      this.cloudStatus.prefs.google_default_expose ||
      this._entities!.map((entity) => computeDomain(entity.entity_id)).filter(
        (value, idx, self) => self.indexOf(value) === idx
      );

    if (
      (expose && defaultExpose.includes(domain)) ||
      (!expose && !defaultExpose.includes(domain))
    ) {
      return;
    }

    if (expose) {
      defaultExpose.push(domain);
    } else {
      defaultExpose.splice(defaultExpose.indexOf(domain), 1);
    }

    await updateCloudPref(this.hass!, {
      google_default_expose: defaultExpose,
    });
    fireEvent(this, "ha-refresh-cloud-status");
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        mwc-list-item > [slot="meta"] {
          margin-left: 4px;
        }
        .banner {
          color: var(--primary-text-color);
          background-color: var(
            --ha-card-background,
            var(--card-background-color, white)
          );
          padding: 16px 8px;
          text-align: center;
        }
        .content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          grid-gap: 8px 8px;
          padding: 8px;
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
        .top-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border-bottom: 1px solid var(--divider-color);
          background: var(--app-header-background-color);
        }
        .header.second {
          border-top: 1px solid var(--divider-color);
        }
        .exposed {
          color: var(--success-color);
        }
        .not-exposed {
          color: var(--error-color);
        }
        @media all and (max-width: 450px) {
          ha-card {
            max-width: 100%;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-google-assistant": CloudGoogleAssistant;
  }
}
