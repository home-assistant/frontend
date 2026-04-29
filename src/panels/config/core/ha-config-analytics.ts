import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-analytics";
import "../../../components/ha-card";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import type { Analytics } from "../../../data/analytics";
import {
  getAnalyticsDetails,
  setAnalyticsPreferences,
} from "../../../data/analytics";
import { getConfigEntries } from "../../../data/config_entries";
import type { LabPreviewFeature } from "../../../data/labs";
import { subscribeLabFeature } from "../../../data/labs";
import {
  fetchZwaveDataCollectionStatus,
  setZwaveDataCollectionPreference,
} from "../../../data/zwave_js";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

@customElement("ha-config-analytics")
class ConfigAnalytics extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _analyticsDetails?: Analytics;

  @state() private _error?: string;

  @state() private _snapshotsLabEnabled = false;

  @state() private _zwaveEntryId?: string;

  @state() private _zwaveDataCollectionOptIn?: boolean;

  @state() private _highlightedSection?: string;

  protected render(): TemplateResult {
    const error = this._error
      ? this._error
      : !isComponentLoaded(this.hass.config, "analytics")
        ? "Analytics integration not loaded"
        : undefined;

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.analytics.header") ||
        "Home Assistant analytics"}
      >
        <div class="card-content">
          ${error ? html`<div class="error">${error}</div>` : nothing}
          <p>
            ${this.hass.localize("ui.panel.config.analytics.intro")}
            <a
              href=${documentationUrl(this.hass, "/integrations/analytics/")}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize("ui.panel.config.analytics.learn_more")}</a
            >.
          </p>
          <ha-analytics
            translation_key_panel="config"
            @analytics-preferences-changed=${this._preferencesChanged}
            .localize=${this.hass.localize}
            .analytics=${this._analyticsDetails}
          ></ha-analytics>
        </div>
      </ha-card>
      ${this._snapshotsLabEnabled
        ? html`<ha-card
            outlined
            .header=${this.hass.localize(
              "ui.panel.config.analytics.preferences.snapshots.header"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.analytics.preferences.snapshots.info",
                  {
                    data_use_statement: html`<a
                      href="https://www.openhomefoundation.org/device-database-data-use-statement"
                      target="_blank"
                      rel="noreferrer"
                      >${this.hass.localize(
                        "ui.panel.config.analytics.preferences.snapshots.data_use_statement"
                      )}</a
                    >`,
                  }
                )}
              </p>
              <ha-md-list>
                <ha-md-list-item>
                  <span slot="headline">
                    ${this.hass.localize(
                      `ui.panel.config.analytics.preferences.snapshots.title`
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.hass.localize(
                      `ui.panel.config.analytics.preferences.snapshots.description`
                    )}
                  </span>
                  <ha-switch
                    slot="end"
                    @change=${this._handleDeviceRowClick}
                    .checked=${!!this._analyticsDetails?.preferences.snapshots}
                    .disabled=${this._analyticsDetails === undefined}
                  ></ha-switch>
                </ha-md-list-item>
              </ha-md-list>
            </div>
          </ha-card>`
        : nothing}
      ${this._zwaveEntryId !== undefined
        ? html`<ha-card
            outlined
            data-section="zwave"
            class=${this._highlightedSection === "zwave" ? "highlighted" : ""}
            .header=${this.hass.localize(
              "ui.panel.config.zwave_js.dashboard.data_collection.title"
            )}
          >
            <div class="card-content">
              <p>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.dashboard.data_collection.info",
                  {
                    documentation_link: html`<a
                      target="_blank"
                      href="https://zwave-js.github.io/node-zwave-js/#/data-collection/data-collection"
                      rel="noreferrer"
                      >${this.hass.localize(
                        "ui.panel.config.zwave_js.dashboard.data_collection.documentation_link"
                      )}</a
                    >`,
                  }
                )}
              </p>
              <ha-md-list>
                <ha-md-list-item>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.data_collection.toggle_title"
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.dashboard.data_collection.toggle_description"
                    )}
                  </span>
                  ${this._zwaveDataCollectionOptIn !== undefined
                    ? html`
                        <ha-switch
                          slot="end"
                          @change=${this._zwaveDataCollectionToggled}
                          .checked=${this._zwaveDataCollectionOptIn === true}
                        ></ha-switch>
                      `
                    : html`<ha-spinner slot="end" size="small"></ha-spinner>`}
                </ha-md-list-item>
              </ha-md-list>
            </div>
          </ha-card>`
        : nothing}
    `;
  }

  public hassSubscribe() {
    return [
      subscribeLabFeature(
        this.hass.connection,
        "analytics",
        "snapshots",
        (feature: LabPreviewFeature) => {
          this._snapshotsLabEnabled = feature.enabled;
        }
      ),
    ];
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    const section = extractSearchParam("section");
    if (section) {
      this._highlightedSection = section;
    }
    if (isComponentLoaded(this.hass.config, "analytics")) {
      this._load();
    }
  }

  private async _load() {
    this._error = undefined;
    try {
      this._analyticsDetails = await getAnalyticsDetails(this.hass);
    } catch (err: any) {
      this._error = err.message || err;
    }
    this._loadZwaveDataCollection();
  }

  private async _loadZwaveDataCollection() {
    if (!isComponentLoaded(this.hass.config, "zwave_js")) {
      return;
    }
    try {
      const entries = await getConfigEntries(this.hass, {
        domain: "zwave_js",
      });
      const entry = entries.find((e) => !e.disabled_by);
      if (entry) {
        this._zwaveEntryId = entry.entry_id;
        const status = await fetchZwaveDataCollectionStatus(
          this.hass,
          entry.entry_id
        );
        this._zwaveDataCollectionOptIn =
          status.opted_in === true || status.enabled === true;
        if (this._highlightedSection === "zwave") {
          this.updateComplete.then(() => {
            this._scrollToSection("zwave");
          });
        }
      }
    } catch {
      // Z-Wave data collection status is optional
    }
  }

  private _scrollToSection(section: string): void {
    const card = this.shadowRoot?.querySelector(
      `[data-section="${section}"]`
    ) as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        this._highlightedSection = undefined;
      }, 3000);
    }
  }

  private async _save() {
    this._error = undefined;
    try {
      await setAnalyticsPreferences(
        this.hass,
        this._analyticsDetails?.preferences || {}
      );
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  private _handleDeviceRowClick(ev: Event) {
    const target = ev.target as HaSwitch;

    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: {
        ...this._analyticsDetails!.preferences,
        snapshots: target.checked,
      },
    };
    this._save();
  }

  private _zwaveDataCollectionToggled(ev: Event) {
    setZwaveDataCollectionPreference(
      this.hass,
      this._zwaveEntryId!,
      (ev.target as HTMLInputElement).checked
    );
  }

  private _preferencesChanged(event: CustomEvent): void {
    this._analyticsDetails = {
      ...this._analyticsDetails!,
      preferences: event.detail.preferences,
    };
    this._save();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .error {
          color: var(--error-color);
        }

        p {
          margin-top: 0;
        }
        ha-card:not(:first-of-type) {
          margin-top: 24px;
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        ha-md-list-item {
          --md-item-overflow: visible;
        }
        ha-card {
          transition: box-shadow 0.3s ease;
        }
        ha-card.highlighted {
          animation: highlight-fade 2.5s ease-out forwards;
        }
        @keyframes highlight-fade {
          0% {
            box-shadow:
              0 0 0 var(--ha-border-width-md) var(--primary-color),
              0 0 12px rgba(var(--rgb-primary-color), 0.4);
          }
          100% {
            box-shadow:
              0 0 0 var(--ha-border-width-md) transparent,
              0 0 0 transparent;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-analytics": ConfigAnalytics;
  }
}
