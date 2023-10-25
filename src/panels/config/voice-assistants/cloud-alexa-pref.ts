import "@material/mwc-button";
import { mdiHelpCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { isEmptyFilter } from "../../../common/entity/entity_filter";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-settings-row";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../data/cloud";
import {
  ExposeEntitySettings,
  getExposeNewEntities,
  setExposeNewEntities,
} from "../../../data/expose";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

export class CloudAlexaPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public exposedEntities?: Record<
    string,
    ExposeEntitySettings
  >;

  @property() public cloudStatus?: CloudStatusLoggedIn;

  @state() private _exposeNew?: boolean;

  private _exposedEntitiesCount = memoizeOne(
    (exposedEntities: Record<string, ExposeEntitySettings>) =>
      Object.entries(exposedEntities).filter(
        ([entityId, expose]) =>
          expose["cloud.alexa"] && entityId in this.hass.states
      ).length
  );

  protected willUpdate() {
    if (!this.hasUpdated) {
      getExposeNewEntities(this.hass, "cloud.alexa").then((value) => {
        this._exposeNew = value.expose_new;
      });
    }
  }

  protected render() {
    if (!this.cloudStatus) {
      return nothing;
    }

    const alexa_registered = this.cloudStatus.alexa_registered;
    const { alexa_enabled, alexa_report_state } = this.cloudStatus!.prefs;

    const manualConfig = !isEmptyFilter(this.cloudStatus.alexa_entities);

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          <img
            alt=""
            src=${brandsUrl({
              domain: "alexa",
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />${this.hass.localize("ui.panel.config.cloud.account.alexa.title")}
        </h1>
        <div class="header-actions">
          <a
            href="https://www.nabucasa.com/config/amazon_alexa/"
            target="_blank"
            rel="noreferrer"
            class="icon-link"
          >
            <ha-icon-button
              .label=${this.hass.localize(
                "ui.panel.config.cloud.account.alexa.link_learn_how_it_works"
              )}
              .path=${mdiHelpCircle}
            ></ha-icon-button>
          </a>
          <ha-switch
            .checked=${alexa_enabled}
            @change=${this._enabledToggleChanged}
          ></ha-switch>
        </div>
        <div class="card-content">
          <p>
            ${this.hass!.localize("ui.panel.config.cloud.account.alexa.info")}
          </p>
          ${manualConfig
            ? html`<ha-alert alert-type="warning">
                ${this.hass.localize(
                  "ui.panel.config.cloud.account.alexa.manual_config"
                )}
              </ha-alert>`
            : ""}
          ${!alexa_enabled
            ? ""
            : html`${!alexa_registered
                  ? html`<ha-alert
                      .title=${this.hass.localize(
                        "ui.panel.config.cloud.account.alexa.not_configured_title"
                      )}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.cloud.account.alexa.not_configured_text"
                      )}

                      <ul>
                        <li>
                          <a
                            href="https://skills-store.amazon.com/deeplink/dp/B0772J1QKB?deviceType=app"
                            target="_blank"
                            rel="noreferrer"
                          >
                            ${this.hass!.localize(
                              "ui.panel.config.cloud.account.alexa.enable_ha_skill"
                            )}
                          </a>
                        </li>
                        <li>
                          <a
                            href="https://www.nabucasa.com/config/amazon_alexa/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            ${this.hass!.localize(
                              "ui.panel.config.cloud.account.alexa.config_documentation"
                            )}
                          </a>
                        </li>
                      </ul>
                    </ha-alert>`
                  : ""}<ha-settings-row>
                  <span slot="heading">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.expose_new_entities"
                    )}
                  </span>
                  <span slot="description">
                    ${this.hass!.localize(
                      "ui.panel.config.cloud.account.alexa.expose_new_entities_info"
                    )}
                  </span>
                  <ha-switch
                    .checked=${this._exposeNew}
                    .disabled=${this._exposeNew === undefined}
                    @change=${this._exposeNewToggleChanged}
                  ></ha-switch> </ha-settings-row
                >${alexa_registered
                  ? html`
                      <ha-settings-row>
                        <span slot="heading">
                          ${this.hass!.localize(
                            "ui.panel.config.cloud.account.alexa.enable_state_reporting"
                          )}
                        </span>
                        <span slot="description">
                          ${this.hass!.localize(
                            "ui.panel.config.cloud.account.alexa.info_state_reporting"
                          )}
                        </span>
                        <ha-switch
                          .checked=${alexa_report_state}
                          @change=${this._reportToggleChanged}
                        ></ha-switch>
                      </ha-settings-row>
                    `
                  : ""}`}
        </div>
        ${alexa_enabled
          ? html`<div class="card-actions">
              <a
                href="/config/voice-assistants/expose?assistants=cloud.alexa&historyBack"
              >
                <mwc-button>
                  ${manualConfig
                    ? this.hass!.localize(
                        "ui.panel.config.cloud.account.alexa.show_entities"
                      )
                    : this.hass.localize(
                        "ui.panel.config.cloud.account.alexa.exposed_entities",
                        {
                          number: this.exposedEntities
                            ? this._exposedEntitiesCount(this.exposedEntities)
                            : 0,
                        }
                      )}
                </mwc-button>
              </a>
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  private async _exposeNewToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    if (this._exposeNew === undefined || this._exposeNew === toggle.checked) {
      return;
    }
    try {
      await setExposeNewEntities(this.hass, "cloud.alexa", toggle.checked);
    } catch (err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _enabledToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, { alexa_enabled: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      toggle.checked = !toggle.checked;
    }
  }

  private async _reportToggleChanged(ev) {
    const toggle = ev.target as HaSwitch;
    try {
      await updateCloudPref(this.hass!, {
        alexa_report_state: toggle.checked!,
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      alert(
        `${this.hass!.localize(
          "ui.panel.config.cloud.account.alexa.state_reporting_error",
          "enable_disable",
          this.hass!.localize(
            toggle.checked
              ? "ui.panel.config.cloud.account.alexa.enable"
              : "ui.panel.config.cloud.account.alexa.disable"
          )
        )} ${err.message}`
      );
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      ha-settings-row {
        padding: 0;
      }
      .header-actions {
        position: absolute;
        right: 24px;
        top: 24px;
        display: flex;
        flex-direction: row;
      }
      :host([dir="rtl"]) .header-actions {
        right: auto;
        left: 24px;
      }
      .header-actions .icon-link {
        margin-top: -16px;
        margin-inline-end: 8px;
        margin-right: 8px;
        direction: var(--direction);
        color: var(--secondary-text-color);
      }
      .card-actions {
        display: flex;
      }
      .card-actions a {
        text-decoration: none;
      }
      .card-header {
        display: flex;
        align-items: center;
      }
      img {
        height: 28px;
        margin-right: 16px;
        margin-inline-end: 16px;
        margin-inline-start: initial;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-alexa-pref": CloudAlexaPref;
  }
}

customElements.define("cloud-alexa-pref", CloudAlexaPref);
